    require('dotenv').config();
var morgan = require('morgan'),
    moment = require('moment'),
    mysqlTimestamps = moment(Date.now()).format('YYYY-MM-DD'),
	exphbs = require('express-handlebars'),
	cookieParser = require('cookie-parser'),
	bodyParser = require('body-parser'),
	crypto = require('crypto'),
	fetch = require('node-fetch'),
	cron = require('node-cron'),
	apiSQL = require('./helper/mysql'),
	transporter = require('./helper/nodemailer'),
	Limiter = require('express-rate-limit'),
	express = require('express'),
	app = express(),
	PORT = process.env.PORT || '3000',
	apiLimiter = Limiter({
		windowMs: 24 * 60 * 60 * 1000, // 24 hours
		max: 200, // 200 request per 24hours for 1 apikey
		keyGenerator: function (req, res) { 
			return req.query.apikey;
		},
	});
app.enable('trust proxy')
app.use(morgan('dev'))
app.set("json spaces",2)
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*")
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, recording-session")
    next()
})
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(cookieParser())
app.engine('hbs', exphbs({ extname: '.hbs' }))
app.set('view engine', 'hbs');
app.use(express.static('public'))

//     ----- USER AUTH -----     //
const authTokens = {};
const getHashedPassword = (password) => {
    const sha256 = crypto.createHash('sha256');
    const hash = sha256.update(password).digest('base64');
    return hash;
}

app.use(apiLimiter)
app.use('/api/xnxx/search', require('./router/xnxx-search'))
app.use('/api/xnxx/detail', require('./router/xnxx-detail'))

//     ----- HANDLE ERROR -----      //
app.use((req, res) => {
	res.status(404).send("404");
})

app.listen(PORT ,() => {
	console.log(`Server Run on port ${PORT}`)
})

//     ----- NODE - CRON -----     //
// Runinng node cron at 9am every sunday to delete unregistered account.
cron.schedule('0 9 * * 0', () => {
	apiSQL.query("DELETE FROM `restkey` WHERE `active` = ?", 'false', function(err, result) {
		if (err) return console.log('Error: ' + result)
		console.log('Success: ' + result)
	})
}, {
	scheduled: true,
	timezone: "Asia/Jakarta"
})
