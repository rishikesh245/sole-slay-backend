const bcrypt = require("bcrypt");

const jwt = require("jsonwebtoken");

const { User } = require("../models");


const registerUser = async (req, res) => {

    try {

        const { name, email, mobile, password } = req.body;

        if (!name || !name.trim()) {

    return res.status(400).json({
        message: "Name is required"
    });

}


        // Check password length

        if (password.length < 8) {

            return res.status(400).json({
                message: "Password must be at least 8 characters"
            });

        }


        // Check email OR mobile

        if (!email && !mobile) {

            return res.status(400).json({
                message: "Email or mobile number is required"
            });

        }


        // Check existing email

        if (email) {

            const existingEmail = await User.findOne({
                where: { email }
            });

            if (existingEmail) {

                return res.status(400).json({
                    message: "Email already registered"
                });

            }

        }


        // Check existing mobile

        if (mobile) {

            const existingMobile = await User.findOne({
                where: { mobile }
            });

            if (existingMobile) {

                return res.status(400).json({
                    message: "Mobile number already registered"
                });

            }

        }


        // Hash password

        const hashedPassword = await bcrypt.hash(
            password,
            10
        );


        // Create user

        const user = await User.create({

            name: name.trim(),

            email: email || null,

            mobile: mobile || null,

            password: hashedPassword

        });


        res.status(201).json({

            message: "User registered successfully",

            userId: user.id

        });


    } catch (error) {

        console.error("REGISTER ERROR:", error);

        res.status(500).json({

            message: "Registration failed",

            error: error.message

        });

    }

};

//Login

const loginUser = async (req, res) => {

    try {

        const { identifier, password } = req.body;


        // Check required fields

        if (!identifier || !password) {

            return res.status(400).json({
                message: "Email/mobile and password are required"
            });

        }


        // Find user using email OR mobile

        const user = await User.findOne({
            where: {
                [require("sequelize").Op.or]: [
                    { email: identifier },
                    { mobile: identifier }
                ]
            }
        });


        // User not found

        if (!user) {

            return res.status(401).json({
                message: "Invalid email/mobile or password"
            });

        }


        // Check password

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );


        if (!passwordMatch) {

            return res.status(401).json({
                message: "Invalid email/mobile or password"
            }); 

        }


        // Login successful

        const token = jwt.sign(
    {
        id: user.id,
        role:user.role
    },
    process.env.JWT_SECRET,
    {
        expiresIn: "1d"
    }
);

        res.status(200).json({

            message: "Login successful",

            token: token,

            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                mobile: user.mobile,
                role: user.role

            }

        });


    } catch (error) {

        console.error("LOGIN ERROR:", error);

        res.status(500).json({

            message: "Login failed",

            error: error.message

        });

    }

};

module.exports = {
    registerUser,
    loginUser
};