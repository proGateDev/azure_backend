const bcrypt = require('bcryptjs');

//==========================================

const checkEncryptedPassword = async (password, encryptedPassword) => {
    const isPasswordValid = await bcrypt.compare(password, encryptedPassword);
    return isPasswordValid
}


function generatePassword() {
    let password = '';
    for (let i = 0; i < 5; i++) {
        password += Math.floor(Math.random() * 10); // Generate a random digit between 0 and 9
    }
    return password;
}


// Function to hash the password using bcrypt
// async function encryptPassword(password) {
//     const salt = await bcrypt.genSalt(10); // Generate a salt
//     const hashedPassword = await bcrypt.hash(password, salt); // Hash the password with the salt
//     return hashedPassword;
// }





module.exports = { checkEncryptedPassword, generatePassword }