const jwt = require('jsonwebtoken');

require('dotenv').config();
const CODE = process.env.JSON_KEY;

function authUser (req, res, next) {
    const userToken = req.cookies.userToken;

    if (!userToken) {
        return res.redirect('/user/login');
    }

    try {
        // verify and decode the token
        const user = jwt.verify(userToken, CODE);
        req.userOne = user;
        next();
        
    } catch (error) {
        res.clearCookie('userToken');
        return res.redirect('/user/login');
    }
}

module.exports = authUser;