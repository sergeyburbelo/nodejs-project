const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');
const Order = require('../models/orderModel');

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach(el => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /updateMyPassword.',
        400
      )
    );
  }

  if (req.body.orders) {
    return next(
      new AppError(
        'This route is not for order updates. Please use /updateMyOrders.',
        400
      )
    );
  }

  // 2) Filtered out unwanted fields names that are not allowed to be updated
  const filteredBody = filterObj(req.body, 'name', 'email');

  // 3) Update user document
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    filteredBody,
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not defined! Please use /signup instead',
  });
};

exports.getUser = factory.getOne(User);
exports.getAllUsers = factory.getAll(User);

// Do NOT update passwords with this!
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);

exports.updateMyOrder = catchAsync(async (req, res, next) => {
  const filteredBody = filterObj(req.body, 'status', 'text');
  console.log(filteredBody);
  // // 3) Update user document
  await Order.findByIdAndUpdate(req.params.orderId, filteredBody);

  res.status(200).json({
    status: 'success',
    data: {
      text: 'order updated',
    },
  });
});

exports.cancelMyOrder = catchAsync(async (req, res, next) => {
  await Order.findByIdAndUpdate(req.params.orderId, {
    status: 'canceled',
  });
  res.status(200).json({
    status: 'success',
    data: {
      text: 'order canceled',
    },
  });
});

exports.restrictToOwner = catchAsync(async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.orderId);

    const userId = req.user._id;
    const orderCustomerId = order.customer._id;

    if (JSON.stringify(orderCustomerId) === JSON.stringify(userId)) {
      next();
    } else {
      next(new AppError('Oh, this is not your order', 403));
    }
  } catch (e) {
    next(new AppError('Something went wrong', 500));
  }
});
