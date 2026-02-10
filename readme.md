# pkm - personal knowledge management

a lightweight, self-hosted knowledge management system built for individuals and small teams. think notion meets obsidian, but open source and completely under your control.

![License](https://img.shields.io/badge/license-GPL--3.0-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)

## what is this?

pkm is a flexible personal knowledge base that lets you organize your thoughts, notes, and data however you want. it's built around the idea that your knowledge should be:

- **yours** - self-hosted, no cloud dependencies
- **flexible** - databases, canvases, journals, drawings - whatever fits your brain
- **fast** - native apps for linux and windows, or use it in your browser
- **connected** - link everything together, see relationships, build your second brain

## features

### core functionality
- **flexible databases** - create custom collections with any fields you need
- **rich text editing** - markdown support with live preview
- **visual canvases** - infinite canvas for mind mapping and visual thinking
- **journal mode** - beautiful, distraction-free writing with varela round typography
- **record linking** - connect related items across different databases
- **file attachments** - upload and manage images, PDFs, and other files

### views & organization
- **table view** - spreadsheet-like interface with sorting and filtering
- **gallery view** - visual card-based layout for image-heavy collections
- **calendar view** - timeline visualization for date-based data
- **graph view** - see connections between your notes and ideas

### collaboration & sharing
- **public/private routing** - share specific documents publicly while keeping others private
- **real-time sync** - socket.io-based live updates across devices
- **headmates support** - multi-user profiles for plural systems

### technical features
- **cross-platform** - web app, linux (.deb), and windows (.exe) native apps
- **auto-updates** - native apps can check for and install updates automatically
- **offline-first** - native apps work without internet connection
- **self-hosted** - run it on your own server, no external dependencies

## what it can't do (yet)

- **mobile apps** - currently web and desktop only (android build exists but needs work)
- **end-to-end encryption** - data is stored in plain text on your server
- **collaborative editing** - multiple people can't edit the same document simultaneously
- **version history** - no built-in undo/redo for document changes
- **full-text search** - basic search only, no advanced query language
- **plugin system** - customization requires code changes

## getting started

### prerequisites

- node.js 18+ and npm
- for native apps: rust toolchain (install from [rustup.rs](https://rustup.rs))

### installation

```bash
# clone the repository
git clone https://github.com/houseofmates/pkm.git
cd pkm

# install dependencies
npm install --legacy-peer-deps

# start the development server
npm run dev
```

the app will be available at `http://localhost:3011`

### building native apps

```bash
# linux .deb package
npm run tauri:build:linux

# windows .exe installer
npm run tauri:build:windows

# outputs to src-tauri/target/release/bundle/
```

### configuration

create a `.env` file in the backend directory:

```env
PORT=4100
BROADCAST_AUTH_KEY=your-secret-key-here
```

## project structure

```
pkm/
├── src/                    # frontend react app
│   ├── components/         # reusable ui components
│   ├── features/           # feature-specific modules
│   ├── pages/              # route pages
│   └── contexts/           # react context providers
├── backend/                # express.js backend
│   ├── server.js           # main server file
│   └── public/             # uploaded files
├── src-tauri/              # tauri native app wrapper
└── !releases/              # built releases for distribution
```

## tech stack

- **frontend**: react 19, vite, tailwindcss, shadcn/ui
- **backend**: express.js, socket.io
- **native apps**: tauri (rust + webview)
- **editor**: tiptap, monaco editor
- **visualization**: react-force-graph, recharts

## contributing

this project is licensed under GPL-3.0, which means:

- ✅ you can use it for anything
- ✅ you can modify it however you want
- ✅ you can distribute your changes
- ❌ you can't make your modified version closed source

if you improve it, share it back! that's the whole point.

### development workflow

1. fork the repo
2. create a feature branch (`git checkout -b feature/cool-new-thing`)
3. make your changes
4. test thoroughly
5. commit with clear messages
6. push and open a pull request

## known issues

- calendar view doesn't respect monday as first day of week in some locales
- large file uploads (>10mb) can timeout
- tauri auto-updater requires manual signing key setup
- some ui elements don't scale well on very small screens

## roadmap

- [ ] mobile apps (react native or capacitor)
- [ ] plugin system for extensibility
- [ ] end-to-end encryption option
- [ ] collaborative editing
- [ ] advanced search with query language
- [ ] version history and conflict resolution
- [ ] import/export from notion, obsidian, etc.

## license

GNU General Public License v3.0 - see LICENSE file for details.

## acknowledgments

built with love by someone who was tired of subscription-based note apps. if you find it useful, consider contributing or just telling a friend.

---

*this is a personal project that grew into something bigger. it's not perfect, but it works for me. hopefully it works for you too.*
