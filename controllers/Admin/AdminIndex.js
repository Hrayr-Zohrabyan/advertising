import express from 'express';

/**
 * routers.get('/admin', adminIndex);
 */
export const adminIndex = (req, res, next) => {
  return res.render(express.static(path.join(__dirname, 'public/admin')));
};