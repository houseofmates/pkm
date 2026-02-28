import axios from 'axios';

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI... (this will use a hardcoded or valid token if we can extract one)"
// Actually let's just use the frontend code which reads from storage
import { getToken } from './src/features/edgeless/storage';
console.log(getToken('nocobase_token'));
