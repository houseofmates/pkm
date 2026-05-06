#!/usr/bin/env node
/**
 * database backup script for pkm
 * backs up nocobase database and configuration
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream');
const { promisify } = require('util');
const tar = require('tar');
const zlib = require('zlib');
const axios = require('axios');

const asyncPipeline = promisify(pipeline);

async function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), 'backups');
  const backupFile = path.join(backupDir, `pkm-backup-${timestamp}.tar.gz`);
  
  // ensure backup directory exists
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  console.log(`Starting backup to ${backupFile}`);
  
  try {
    // create backup manifest
    const manifest = {
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || 'unknown',
      backupType: 'full',
      includes: ['database', 'config', 'uploads']
    };
    
    // write manifest to temp file
    const manifestPath = path.join(backupDir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    
    // backup nocobase database (assuming sqlite for simplicity)
    // adjust based on your actual database setup
    const dbPath = process.env.NOCOBASE_DB_PATH || './data/database.sqlite';
    if (fs.existsSync(dbPath)) {
      console.log('Backing up database...');
      await asyncPipeline(
        fs.createReadStream(dbPath),
        tar.create({ gzip: true, file: path.join(backupDir, 'database.tar.gz') })
      );
    }
    
    // backup uploads/assets
    const uploadsPath = path.join(process.cwd(), 'public');
    if (fs.existsSync(uploadsPath)) {
      console.log('Backing up uploads...');
      await asyncPipeline(
        fs.createReadStream(uploadsPath),
        tar.create({ gzip: true, file: path.join(backupDir, 'uploads.tar.gz') })
      );
    }
    
    // backup configuration
    const configFiles = [
      '.env',
      'package.json',
      'packages/backend/server.js',
      'packages/core/vite.config.ts',
      'apps/web/vite.config.ts'
    ];
    
    const configDir = path.join(backupDir, 'config');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir);
    }
    
    for (const file of configFiles) {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        fs.copyFileSync(filePath, path.join(configDir, path.basename(file)));
      }
    }
    
    // create final archive
    console.log('Creating final archive...');
    await tar.create({
      gzip: true,
      file: backupFile,
      cwd: backupDir,
      include: [
        'manifest.json',
        'database.tar.gz',
        'uploads.tar.gz',
        'config/'
      ]
    });
    
    // cleanup temporary files
    fs.unlinkSync(path.join(backupDir, 'manifest.json'));
    fs.unlinkSync(path.join(backupDir, 'database.tar.gz'));
    fs.unlinkSync(path.join(backupDir, 'uploads.tar.gz'));
    fs.rmdirSync(path.join(backupDir, 'config'), { recursive: true });
    
    console.log(`Backup completed successfully: ${backupFile}`);
    
    // optional: upload to remote storage (s3, etc.)
    if (process.env.BACKUP_S3_BUCKET) {
      await uploadToS3(backupFile);
    }
    
    return backupFile;
  } catch (error) {
    console.error('Backup failed:', error);
    throw error;
  }
}

async function uploadToS3(filePath) {
  const AWS = require('aws-sdk');
  const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1'
  });
  
  const fileName = path.basename(filePath);
  const params = {
    Bucket: process.env.BACKUP_S3_BUCKET,
    Key: `pkm-backups/${fileName}`,
    Body: fs.createReadStream(filePath),
    ServerSideEncryption: 'AES256'
  };
  
  console.log(`Uploading backup to S3: ${params.Key}`);
  await s3.upload(params).promise();
  console.log('S3 upload completed');
}

async function listBackups() {
  const backupDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    console.log('No backups found');
    return [];
  }
  
  const files = fs.readdirSync(backupDir)
    .filter(file => file.endsWith('.tar.gz'))
    .map(file => ({
      name: file,
      path: path.join(backupDir, file),
      size: fs.statSync(path.join(backupDir, file)).size,
      date: fs.statSync(path.join(backupDir, file)).mtime
    }))
    .sort((a, b) => b.date - a.date);
  
  console.log(`Found ${files.length} backups:`);
  files.forEach((file, index) => {
    console.log(`${index + 1}. ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB) - ${file.date}`);
  });
  
  return files;
}

async function restoreBackup(backupFile) {
  const backupDir = path.join(process.cwd(), 'backups');
  const backupPath = path.isAbsolute(backupFile) ? backupFile : path.join(backupDir, backupFile);
  
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file not found: ${backupPath}`);
  }
  
  console.log(`Restoring from ${backupPath}`);
  
  // extract backup
  const extractDir = path.join(backupDir, 'restore-temp');
  if (fs.existsSync(extractDir)) {
    fs.rmdirSync(extractDir, { recursive: true });
  }
  fs.mkdirSync(extractDir);
  
  await tar.extract({
    gzip: true,
    file: backupPath,
    cwd: extractDir
  });
  
  // read manifest
  const manifestPath = path.join(extractDir, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    console.log(`Restoring backup from ${manifest.timestamp} (${manifest.backupType})`);
  }
  
  // restore database
  const dbBackup = path.join(extractDir, 'database.tar.gz');
  if (fs.existsSync(dbBackup)) {
    const dbPath = process.env.NOCOBASE_DB_PATH || './data/database.sqlite';
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    console.log('Restoring database...');
    await tar.extract({
      gzip: true,
      file: dbBackup,
      cwd: dbDir
    });
  }
  
  // restore uploads
  const uploadsBackup = path.join(extractDir, 'uploads.tar.gz');
  if (fs.existsSync(uploadsBackup)) {
    const uploadsPath = path.join(process.cwd(), 'public');
    console.log('Restoring uploads...');
    await tar.extract({
      gzip: true,
      file: uploadsBackup,
      cwd: path.dirname(uploadsPath)
    });
  }
  
  // restore config (optional - be careful not to overwrite current settings)
  const configBackup = path.join(extractDir, 'config');
  if (fs.existsSync(configBackup)) {
    console.log('Config files available in backup/config (not restored automatically for safety)');
  }
  
  // cleanup
  fs.rmdirSync(extractDir, { recursive: true });
  
  console.log('Restore completed');
}

// cli interface
const command = process.argv[2];

switch (command) {
  case 'create':
    backupDatabase().catch(console.error);
    break;
  case 'list':
    listBackups().catch(console.error);
    break;
  case 'restore':
    const backupName = process.argv[3];
    if (!backupName) {
      console.error('Please specify a backup file to restore');
      process.exit(1);
    }
    restoreBackup(backupName).catch(console.error);
    break;
  default:
    console.log(`
PKM Database Backup Utility

Usage:
  node scripts/backup-database.js create   # Create a new backup
  node scripts/backup-database.js list     # List available backups
  node scripts/backup-database.js restore <backup-file>  # Restore from backup

Environment Variables:
  NOCOBASE_DB_PATH        Path to NocoBase database (default: ./data/database.sqlite)
  BACKUP_S3_BUCKET        S3 bucket for remote backups
  AWS_ACCESS_KEY_ID       AWS access key ID
  AWS_SECRET_ACCESS_KEY   AWS secret access key
  AWS_REGION              AWS region (default: us-east-1)
`);
}