var express = require('express');
const userController = require('../controllers/userController');

const authUser = require('../middlewares/authUser');

var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index');
});

// user
router.get('/user/login', userController.login);
router.get('/user/logout', userController.userLogout);
router.get('/user/register', userController.register);
router.get('/user/dashboard', authUser, userController.dashboard);
router.get('/user/addCategory', authUser, userController.addCategory);
router.get('/user/removeCategory/:userId/:catId', authUser, userController.removeCategory);
router.get('/user/credit/', authUser, userController.credit);
router.get('/user/expense/', authUser, userController.expense);
router.get('/user/reports', authUser, userController.pageReports);
router.get('/user/limit', authUser, userController.pageLimit);
router.get('/user/removeExpense/:transactionId', authUser, userController.removeTransaction);
router.get('/user/removeCredit/:transactionId', authUser, userController.removeCreditTransaction);
router.get('/user/piggyBank', authUser, userController.pagePiggyBank);
router.get('/user/destroyGoal/:goalId', authUser, userController.destroyGoalSavings);

router.post('/user/register', userController.registerUserData);
router.post('/user/login', userController.userLoginProcess);
router.post('/user/addCategory/:id', userController.insertCategory);
router.post('/user/addCredit/:id', userController.addCredit);
router.post('/user/addExpense/:id', userController.addExpense);
router.post('/user/addLimit/:userId', userController.addLimit);
router.post('/user/updateCategoryLimit/:categoryId', userController.updateCategoryLimit);
router.post('/user/addGoal/:id', userController.addGoal);
router.post('/user/addSavings/:id/:goalId', userController.addSavings);



module.exports = router;
