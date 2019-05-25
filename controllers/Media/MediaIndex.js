import path from 'path';
import multer from 'multer';
import sharp from 'sharp';
import fs from 'fs';
import AuthenticationHelper from '../../helpers/AuthenticationHelper';
import Media from '../../models/media';

const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif'];
const storage = multer.diskStorage({
  destination: (req, file, cb) => {

    cb(null, path.join(__dirname, '../../public/media'));
  },
  filename: (req, file, cb) => {
    if (file.originalname.indexOf('.') == -1) return cb('no extension');
    const parts = file.originalname.split('.');
    const extension = parts[parts.length - 1];
    if (allowedExtensions.indexOf(extension) == -1) return cb('unallowed extension');

    cb(null, `mediaObject-${Date.now()}.${extension}`);
  }
});
const upload = multer({ storage: storage }).single('photo');

/**
 * routers.get('/media/:objectId', getMedia);
 */
export const getMedia = async (req, res, next) => {
  try {
    const mediaObject = await Media.findOne({id: req.params.objectId});
    const parts = mediaObject.path.split('.');
    const extension = parts[parts.length - 1];

    if (req.query.width || req.query.height) {
      let width = 0;
      let height = 0;
      let resizedFileName = parts[0];
      let dimensions = {};
      if (req.query.width) {
        width = +req.query.width;
        resizedFileName += `w${width}`;
        dimensions.width = width;
      }
      if (req.query.height) {
        height = +req.query.height;
        resizedFileName += `h${height}`;
        dimensions.height = height;
      }

      resizedFileName += `.${extension}`;
      try {
        fs.accessSync(path.join(__dirname, `../../public/media/${resizedFileName}`));
        return res.sendFile(path.join(__dirname, `../../public/media/${resizedFileName}`));
      } catch (e) {
        sharp(path.join(__dirname, `../../public/media/${mediaObject.path}`))
          .resize(dimensions)
          .toFile(path.join(__dirname, `../../public/media/${resizedFileName}`), (err, info) => {
            return res.sendFile(path.join(__dirname, `../../public/media/${resizedFileName}`));
          });
      }

    } else {
      return res.sendFile(path.join(__dirname, `../../public/media/${mediaObject.path}`));
    }
  } catch (e) {
    res.status(404).json({success: false, error: {message: 'File not found'}});
  }
};

/**
 * routers.post('/media', uploadMedia);
 */
export const uploadMedia = async (req, res, next) => {
  const tokenResponse = AuthenticationHelper.decodeToken(req.headers.authorization);
  try {
    await AuthenticationHelper.checkPermission(req.project, req.headers.authorization, ['SUPER_USER', 'POST_MEDIA']);
    const dir = './public/media';
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }

    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({success: false, message: err});
      }
      const mediaObject = await Media.create({path: req.file.filename});
      
      return res.json({success: true, data: {objectId: mediaObject.id}});
    })
  } catch (e) {
    return res.status(403).json({success: false, error: {message: 'No permission to use this API call'}});
  }
};