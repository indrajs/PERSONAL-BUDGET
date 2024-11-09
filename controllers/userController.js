const jwt = require("jsonwebtoken");
const prisma = require("../config/database");

require('dotenv').config();
const CODE = process.env.JSON_KEY;

async function login(req, res) {
    try {
        res.render('user/login');
    } catch (error) {
        console.error(error);
    }
}

async function register(req, res) {
    try {
        res.render('user/register');
    } catch (error) {
        console.error(error);
    }
}

async function registerUserData (req, res) {
    try {
        const { name, email, password } = req.body;
        const addUser = await prisma.User.create({
            data: {
                name: name,
                email: email,
                password: password
            }
        });

        console.log('User added');
        res.redirect('/user/login');
    } catch (error) {
        console.error(error);
    }
}

// handle emp login requests
async function userLoginProcess (req, res) {
    try {
        const { email, password } = req.body;

        const user = await prisma.User.findUnique({
            where: {
                email: email
            }
        });

        if (!user) {
            return res.status(404).json({ message: "User not found"});
        }

        let isPassVaild = false;

        if ((user.password) === password) {
            isPassVaild = true;
        }

        if (!isPassVaild) {
            return res.status(401).json({message: "Invaild password"})
        }

        const token = jwt.sign({ userId: user.id }, CODE, { expiresIn: '1h' });

        res.cookie("userToken", token, { httpOnly: true });

        res.redirect('/user/dashboard');

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error logging in' });
    }
}

async function userLogout (req, res) {  
    res.clearCookie('userToken');
    return res.redirect('/user/dashboard');
}

async function dashboard (req, res) {
    try {
        const userData = req.userOne;
        const pk = userData.userId;

        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1; 
        const currentYear = currentDate.getFullYear();

        // Fetch categories with their total expenses
        const categories = await prisma.category.findMany({
            where: { userId: parseInt(pk) },
            include: {
                transactions: {
                    where: { 
                        transactionType: 'EXPENSE',
                        month: parseInt(currentMonth)
                    },
                    select: {
                        amount: true
                    }
                }
            }
        });

        // Calculate total expenses per category and determine if they exceed the limit
        const categoriesWithLimit = categories.map(category => {
            const totalExpense = category.transactions.reduce((total, transaction) => total + transaction.amount, 0);
            return {
                ...category,
                totalExpense,
                exceededLimit: totalExpense >= category.limit // Check if limit is exceeded or equal
            };
        });
        

        // Fetch category-wise expenses
        const categoryExpense = await prisma.transaction.findMany({
            where: {
                userId: parseInt(pk),
                transactionType: 'EXPENSE',
                month: currentMonth,
                year: currentYear
            },
            include: {
                category: true
            }
        });

        // Create a map to group and sum amounts by category
        const categoryTotals = {};

        categoryExpense.forEach(transaction => {
            const categoryName = transaction.category.name;
            
            if (!categoryTotals[categoryName]) {
                categoryTotals[categoryName] = 0;  // Initialize if not present
            }
            
            // Add the transaction amount to the respective category total
            categoryTotals[categoryName] += transaction.amount;
        });

        // Extract labels and total amounts from the categoryTotals map
        const categoryLabels = Object.keys(categoryTotals);  // Get category names
        const categoryAmounts = Object.values(categoryTotals);  // Get total amounts for each category

        console.log(categoryLabels);
        console.log(categoryAmounts);
        

        // Calculate total income (CREDIT transactions)
        const totalIncome = await prisma.transaction.aggregate({
            _sum: {
                amount: true,
            },
            where: {
                userId: parseInt(pk),
                transactionType: 'CREDIT',
                month: currentMonth,
                year: currentYear
            }
        });

        // Calculate total expense (EXPENSE transactions)
        const totalExpense = await prisma.transaction.aggregate({
            _sum: {
                amount: true,
            },
            where: {
                userId: parseInt(pk),
                transactionType: 'EXPENSE',
                month: currentMonth,
                year: currentYear
            }
        });

        const income = totalIncome._sum.amount || 0;
        const expense = totalExpense._sum.amount || 0;
        const balance = income - expense;

        const users = await prisma.User.findUnique({
            where: { id: parseInt(pk) }
        });

        res.render('user/dashboard', { data: users, income, expense, balance,
            currentMonth, categoryExpense,
            categoryLabels: JSON.stringify(categoryLabels),
            categoryAmounts: JSON.stringify(categoryAmounts),
            categoriesWithLimit: categoriesWithLimit,
        });
    } catch (error) {
        console.error(error);
    }
}

async function addCategory (req, res) {
    try {
        const userData = req.userOne;
        const pk = userData.userId;

        const users = await prisma.User.findUnique({
            where: { id: parseInt(pk) }
        });

        const category = await prisma.Category.findMany({
            where: { userId: parseInt(pk) }
        });

        res.render('user/addCategory', { data: users, category });
    } catch (error) {
        console.error(error);
    }
}

async function insertCategory (req, res) {
    try {
        const { category } = req.body;
        const pk = parseInt(req.params.id);

        const addCategory = await prisma.Category.create({
            data: {
                name: category,
                userId: pk,
            }
        });
        console.log('Category is added');

        res.redirect('/user/addCategory');
    } catch (error) {
        console.error(error);
    }
}

async function credit (req, res) {
    try {
        const userData = req.userOne;
        const pk = userData.userId;

        const users = await prisma.User.findUnique({
            where: { id: parseInt(pk) }
        });

        const transaction = await prisma.Transaction.findMany({
            where: { 
                userId: parseInt(pk),
                transactionType: 'CREDIT'
            },
            include: {
                category: true
            },
            orderBy: { createdAt: 'desc' }
        });

        res.render('user/credit', { data: users, transaction });
    } catch (error) {
        console.error(error);
    }
}

async function addCredit (req, res) {
    try {
        const { amt, notes } = req.body;
        const pk = parseInt(req.params.id);

        // Get the current date
        const currentDate = new Date();
        const month = currentDate.getMonth() + 1; // getMonth() returns 0-11, so +1 to get 1-12
        const year = currentDate.getFullYear();

        // Check if the category 'Credit' exists for the current user
        let category = await prisma.category.findFirst({
            where: {
                userId: pk,        // The current logged-in user's ID
                name: 'Credit'     // Look for a category named 'Credit'
            }
        });

        console.log(category);
        

        // If the category does not exist, create a new category 'Credit'
        if (!category) {
            category = await prisma.category.create({
                data: {
                    userId: pk,
                    name: 'Credit'   // Name the category as 'Credit'
                }
            });
        }

        const addCredit = await prisma.transaction.create({
            data: {
                userId: pk,
                categoryId:  parseInt(category.id), // Use the dynamic categoryId
                amount: parseInt(amt),
                description: notes,
                transactionType: 'CREDIT', // Ensure transaction type is set to 'CREDIT'
                transactionDate: currentDate, // Current date
                month: month, // Extracted month from currentDate
                year: year,   // Extracted year from currentDate
            }
        });
        console.log('credit is added');

        res.redirect('/user/credit');
    } catch (error) {
        console.error(error);
    }
}

async function removeCategory(req, res) {
    try {
        const userId = parseInt(req.params.userId);
        const catId = parseInt(req.params.catId);

        const removeCat = await prisma.Category.delete({
            where: {
                id: catId,
                userId: userId
            }
        });

        res.redirect('/user/addCategory');
    } catch (error) {
        console.error(error);
    }
}

async function expense (req, res) {
    try {
        const userData = req.userOne;
        const pk = userData.userId;

        const users = await prisma.User.findUnique({
            where: { id: parseInt(pk) }
        });

        const category = await prisma.Category.findMany({
            where: { userId: parseInt(pk) }
        });

        const transaction = await prisma.Transaction.findMany({
            where: { 
                userId: parseInt(pk),
                transactionType: 'EXPENSE'
            },
            include: {
                category: true
            },
            orderBy: { createdAt: 'desc' }
        });


        res.render('user/expense', { data: users, category, transaction });
    } catch (error) {
        console.error(error);
    }
}

async function addExpense (req, res) {
    try {
        const { category, amt, notes } = req.body;
        const pk = parseInt(req.params.id);

        // Get the current date
        const currentDate = new Date();
        const month = currentDate.getMonth() + 1; 
        const year = currentDate.getFullYear();

        const addExpense = await prisma.transaction.create({
            data: {
                userId: pk,
                categoryId: parseInt(category), 
                amount: parseInt(amt),
                description: notes,
                transactionType: 'EXPENSE', 
                transactionDate: currentDate, 
                month: month, 
                year: year,   
            }
        });
        console.log('EXPENSE is added');

        res.redirect('/user/expense');
    } catch (error) {
        console.error(error);
    }
}

async function pageReports(req, res) {
    try {
        const userData = req.userOne;
        const pk = userData.userId;

        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();
        const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
        const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;

        // Fetch current month expenses
        const currentMonthExpenses = await prisma.transaction.findMany({
            where: {
                userId: parseInt(pk),
                transactionType: 'EXPENSE',
                month: currentMonth,
                year: currentYear
            },
            select: {
                amount: true,
                category: {
                    select: {
                        name: true
                    }
                }
            }
        });

        // Fetch previous month expenses
        const previousMonthExpenses = await prisma.transaction.findMany({
            where: {
                userId: parseInt(pk),
                transactionType: 'EXPENSE',
                month: previousMonth,
                year: previousYear
            },
            select: {
                amount: true,
                category: {
                    select: {
                        name: true
                    }
                }
            }
        });
console.log(previousMonthExpenses); //ok ann

        // Fetch total expenses for each month of the current year
        const monthlyExpenses = await prisma.transaction.findMany({
            where: {
                userId: parseInt(pk),
                transactionType: 'EXPENSE',
                year: currentYear
            },
            select: {
                amount: true,
                month: true
            }
        });

        // Aggregation for current month
        const currentMonthTotals = {};
        currentMonthExpenses.forEach(transaction => {
            const categoryName = transaction.category.name;
            if (!currentMonthTotals[categoryName]) {
                currentMonthTotals[categoryName] = 0;
            }
            currentMonthTotals[categoryName] += transaction.amount;
        });

        // Aggregation for previous month
        const previousMonthTotals = {};
        previousMonthExpenses.forEach(transaction => {
            const categoryName = transaction.category.name;
            if (!previousMonthTotals[categoryName]) {
                previousMonthTotals[categoryName] = 0;
            }
            previousMonthTotals[categoryName] += transaction.amount;
        });

        console.log(previousMonthTotals);
        

        // Aggregation for monthly totals
        const monthlyTotals = {};
        monthlyExpenses.forEach(transaction => {
            const monthLabel = `Month ${transaction.month}`;
            if (!monthlyTotals[monthLabel]) {
                monthlyTotals[monthLabel] = 0;
            }
            monthlyTotals[monthLabel] += transaction.amount;
        });

        // Prepare data for charts
        const categoryLabels = Object.keys(currentMonthTotals);
        const currentMonthAmounts = Object.values(currentMonthTotals);
        const previousMonthAmounts = Object.values(previousMonthTotals);

        const monthlyLabels = Object.keys(monthlyTotals);
        const monthlyAmounts = Object.values(monthlyTotals);

        const users = await prisma.User.findUnique({
            where: { id: parseInt(pk) }
        });

        res.render('user/reports', {
            categoryLabels: JSON.stringify(categoryLabels),
            currentMonthAmounts: JSON.stringify(currentMonthAmounts),
            previousMonthAmounts: JSON.stringify(previousMonthAmounts),
            monthlyLabels: JSON.stringify(monthlyLabels),
            monthlyAmounts: JSON.stringify(monthlyAmounts),
            currentMonth,
            data: users
        });
    } catch (error) {
        console.error(error);
    }
}

async function pageLimit (req, res) {
    try {
        const userData = req.userOne;
        const pk = userData.userId;

        const users = await prisma.User.findUnique({
            where: { id: parseInt(pk) }
        });

        const categoryList = await prisma.Category.findMany({
            where: { userId: parseInt(pk) }
        });

        res.render('user/limit', { 
            data: users,
            categoryList, 
        });
    } catch (error) {
        console.error(error);
    }
}

async function addLimit(req, res) {
    try {

        const pk = req.params.userId;
        const { category, limitamt } = req.body;

        const addLimitCat = await prisma.Category.update({
            where: { 
                id: parseInt(category),
                userId: parseInt(pk),
            },
            data: {
                limit: parseFloat(limitamt)
            }
        });
        console.log('limit is added');

        res.redirect('/user/addCategory');
    } catch (error) {
        console.error(error);
    }
}

async function updateCategoryLimit(req, res) {
    try {
        const { categoryId } = req.params;
        const { newLimit } = req.body;

        // Update the category limit
        await prisma.Category.update({
            where: { id: parseInt(categoryId) },
            data: { limit: parseFloat(newLimit) }
        });

        console.log(`Category limit updated to ${newLimit}`);
        res.redirect('/user/dashboard');  // Redirect to the reports page after updating
    } catch (error) {
        console.error('Error updating category limit:', error);
        res.status(500).send('Error updating category limit');
    }
}

async function removeTransaction(req, res) {
    try {
        const pk = req.params.transactionId;

        const removeTrans = await prisma.Transaction.delete({
            where: { id: parseInt(pk), transactionType: 'EXPENSE' }
        });

        console.log('Remove the transaction');
        res.redirect('/user/expense');
    } catch (error) {
        console.error(error);
    }
}

async function removeCreditTransaction(req, res) {
    try {
        const pk = req.params.transactionId;
        console.log(pk);

        const removeCreditTrans = await prisma.Transaction.delete({
            where: { id: parseInt(pk), transactionType: 'CREDIT' }
        });

        console.log('Remove the transaction');
        res.redirect('/user/credit');
    } catch (error) {
        console.error(error);
    }
}

async function pagePiggyBank(req, res) {
    try {
        const userData = req.userOne;
        const pk = userData.userId;

        const users = await prisma.User.findUnique({
            where: { id: parseInt(pk) }
        });

        const savings = await prisma.savings.findMany({
            where: { userId: parseInt(pk) },
            orderBy: { createdAt: 'desc' }
        });

        const firstGoal = await prisma.Goal.findFirst({
            where: { userId: parseInt(pk) },
            orderBy: { createdAt: 'desc' }
        });

        res.render('user/piggyBank', {
            data: users,
            savings,
            firstGoal,
            messages: req.flash()
        });
    } catch (error) {
        console.error(error);
    }
}

async function addGoal(req, res) {
    try {
        const id = parseInt(req.params.id);

        const { targetAmount, description } = req.body;
        const newGoal = await prisma.goal.create({
            data: {
                targetAmount: parseFloat(targetAmount),
                description: description,
                userId: id,
                reached: false
            }
        });
        res.redirect('/user/piggyBank');
    } catch (error) {
        console.error(error);
        
    }
}

async function addSavings(req, res) {
    try {
        const userId = req.params.id; 
        const goalId = req.params.goalId; 
        const { amount } = req.body; 

        // Parse the amount to a float
        const savingsAmount = parseFloat(amount);

        // Retrieve the goal to get the target amount
        const goal = await prisma.goal.findUnique({
            where: { id: parseInt(goalId) },
            include: { savings: true }, 
        });

        if (!goal) {
            req.flash('error', 'Goal not found');
        }

        // Calculate total savings for the goal
        const totalSavings = goal.savings.reduce((acc, saving) => acc + saving.amount, 0);

        // Check if adding the new savings exceeds the goal's target amount
        if (totalSavings + savingsAmount > goal.targetAmount) {
            req.flash('error', 'Savings amount exceeds the goal target amount');
        }

        // Create a new savings entry
        const newSavings = await prisma.savings.create({
            data: {
                amount: savingsAmount,
                userId: parseInt(userId),
                goalId: parseInt(goalId),
            }
        });

        // Update the goal to mark it as reached if total savings meet or exceed the target
        const updatedTotalSavings = totalSavings + savingsAmount;
        if (updatedTotalSavings >= goal.targetAmount) {
            await prisma.goal.update({
                where: { id: goal.id },
                data: { reached: true },
            });
        }

        res.redirect('/user/piggyBank');
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function destroyGoalSavings(req, res) {
    try {
        const goalId = parseInt(req.params.goalId);

        // Delete all savings records associated with the goal
        await prisma.savings.deleteMany({
            where: {
                goalId: goalId,
            },
        });

        // Now delete the goal itself
        await prisma.goal.delete({
            where: {
                id: goalId,
            },
        });

        // Redirect to the piggy bank page after deletion
        res.redirect('/user/piggyBank');
    } catch (error) {
        console.error('Error deleting goal and savings:', error);
        res.status(500).json({ error: 'An error occurred while deleting the goal and its savings.' });
    }
}



module.exports = {
    login, register, registerUserData, userLoginProcess, dashboard, userLogout,
    addCategory, insertCategory, credit, addCredit, expense, addExpense, removeCategory,
    pageReports, pageLimit, addLimit, updateCategoryLimit, removeTransaction,
    removeCreditTransaction, pagePiggyBank, addGoal, addSavings, destroyGoalSavings,
};