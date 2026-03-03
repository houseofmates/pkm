const axios = require('axios');

async function main() {
  try {
    const loginRes = await axios.post('https://pkm.houseofmates.space/api/auth:signIn', {
      authenticator: 'email',
      account: 'house@houseofmates.space',
      password: process.env.NOCOBASE_PASSWORD || 'password123'
    });
    
    // get captures
    const res = await axios.get('https://pkm.houseofmates.space/api/captures:list', {
      headers: {
        Authorization: `Bearer ${loginRes.data.data.token}`
      }
    });
    
    console.log(JSON.stringify(res.data, null, 2));

  } catch(e) {
    console.error(e.response ? e.response.data : e.message);
  }
}
main();
