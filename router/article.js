const express = require('express')
const router = express.Router()

const article_handler = require('../router_handler/article')

// 导入解析 formdata 格式表单数据的包
const multer = require('multer')

// 导入处理图片路径的核心模块
const path = require('path')

// 导入验证数据的中间件
const expressJoi = require('@escook/express-joi')

// 导入文章的数据验证模块
const { add_article_schema, del_article_schema } = require('../schema/article')

// 创建 multer 的实例对象，通过 destination 属性指定文件的存放路径,filename指定文件存放名为上传文件名
const storage = multer.diskStorage({
  destination: path.join(__dirname, '../uploads'),
  filename: function (req, file, cb) {
    cb(
      null,
      `${req.body.title}.${file.mimetype.slice(
        file.mimetype.lastIndexOf('/') + 1
      )}`
    )
  }
})
const upload = multer({ storage })
// 发布新文章的路由
// 注意：在当前的路由中，先后使用了两个中间件：
/* 	先使用 multer 解析表单数据
 *	upload.single() 是一个局部生效的中间件，用来解析 FormData 格式的表单数据
 *	将文件类型的数据，解析并挂载到 req.file 属性中
 *	将文本类型的数据，解析并挂载到 req.body 属性中
 */
//  再使用 expressJoi 对解析的表单数据进行验证
router.post(
  '/add',
  upload.single('cover_img'),
  expressJoi(add_article_schema),
  article_handler.addArticle
)

// 根据id删除文章的路由
router.get(
  '/delete/:id',
  expressJoi(del_article_schema),
  article_handler.deleteArticleById
)

// 更改文章的路由
router.post(
  '/update/:id',
  upload.single('cover_img'),
  expressJoi(add_article_schema),
  article_handler.updateArticle
)

// 获取文章列表
router.get('/articles', article_handler.getArticles)

// 获取文章列表
router.get('/get/:id', article_handler.getArticleById)
module.exports = router
