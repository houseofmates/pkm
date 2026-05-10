const axios = require('axios');

async function getDoc() {
    try {
        const res = await axios.get('http://127.0.0.1:8091/api/swagger.json');
        const fieldsCreate = res.data.paths['/collections/{collection}/fields:create'];
        console.log(JSON.stringify(fieldsCreate, null, 2));
    } catch (e) {
        console.log(e.message);
    }
}

getDoc();
