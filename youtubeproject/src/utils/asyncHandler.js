const asynHandle = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

export { asynHandle };

// const asynHandle = () =>{}
// const asynHandle = (fn) => () => {}
// const asynHandle = (fn) => async () => {}

// next for middleware
// const asynHandle = (func) => async (req,res,next) => {
//     try {
//         await func(req,res,next)
//     } catch (error) {
//         res.status(err.code || 500).json({
//             success:false,
//             message:err.message
//         })
//     }
// }
