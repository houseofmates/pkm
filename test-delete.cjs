const axios = require('axios');

async function testDelete() {
    try {
        const loginRes = await axios.post('https://db.houseofmates.space/api/auth:signIn', {
            authenticator: 'email',
            account: 'house@houseofmates.space',
            password: 'password'
        });

        const token = loginRes.data.data.token;
        console.log('Logged in, got token');

        // Create a dummy collection first
        const createRes = await axios.post('https://db.houseofmates.space/api/collections:create', {
            name: 'test_delete_collection',
            title: 'Test Delete',
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Created collection:', createRes.data);

        // Now try to delete it
        const deleteRes = await axios.post('https://db.houseofmates.space/api/collections:destroy?filterByTk=test_delete_collection', {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Deleted collection:', deleteRes.data);

    } catch (error) {
        console.error('API Error:', error.response?.data || error.message);
    }
}

testDelete();
