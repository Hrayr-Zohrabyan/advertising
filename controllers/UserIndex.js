/**
 * GET home page;
 * routers.get('/', UserIndex.index);
 */
export const userIndex = async (req, res, next) => {
  return res.render('index', { title: 'Tailors Api' });
};