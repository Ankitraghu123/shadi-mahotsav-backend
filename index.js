require('dotenv').config('./.env');
const express = require('express');
const dbConnect = require('./config/dbConnect');
dbConnect();
const { errorHandler, notFound } = require('./middlewares/errorHandler');
const app = express();
const cors = require('cors');
const fileUpload = require('express-fileupload');
const UserRouter = require('./routes/UserRoutes');
const FranchiseRouter = require('./routes/FranchiseRoutes');
const MessageRouter = require('./routes/MessageRoutes');
const ContactRouter = require('./routes/ContactRoutes');
const AdminRouter = require('./routes/AdminRoutes');
const PlanRouter = require('./routes/PlanRoutes');

const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const http = require('http');
const initSocketIo = require('./config/SocketConfig');

const server = http.createServer(app);
const io = initSocketIo(server);

app.use((req, res, next) => {
  req.io = io;
  next();
});


app.use(fileUpload());
app.use(morgan('dev'));
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());

app.use('/api/user', UserRouter);
app.use('/api/franchise', FranchiseRouter);
app.use('/api/message', MessageRouter);
app.use('/api/enquiry', ContactRouter);
app.use('/api/admin', AdminRouter);
app.use('/api/plan', PlanRouter);


app.use(notFound);
app.use(errorHandler);

server.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
