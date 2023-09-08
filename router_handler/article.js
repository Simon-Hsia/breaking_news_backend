// 导入数据库操作模块
const db = require('../db/index')

// 发布新文章的处理函数
exports.addArticle = (req, res) => {
  // 手动判断是否上传了文章封面
  if (!req.file || req.file.fieldname !== 'cover_img')
    return res.cc('文章封面是必选参数！')
  // TODO：表单数据合法，继续后面的处理流程...
  // 导入处理路径的 path 核心模块
  const path = require('path')
  const articleInfo = {
    // 标题、内容、状态、所属的分类Id
    ...req.body,
    // 文章封面在服务器端的存放路径
    cover_img: path.join('/uploads', req.file.filename),
    // 文章发布时间
    pub_date: new Date(),
    // 文章作者的Id
    author_id: req.user.id
  }
  const sql_insert = `insert into ev_articles set ?`
  // 执行 SQL 语句
  db.query(sql_insert, articleInfo, (err, results) => {
    // 执行 SQL 语句失败
    if (err) return res.cc(err)
    // 执行 SQL 语句成功，但是影响行数不等于 1
    if (results.affectedRows !== 1) return res.cc('发布文章失败！')

    // 发布文章成功
    res.cc('发布文章成功', 0)
  })
}

exports.deleteArticleById = (req, res) => {
  const sql_update = `update ev_articles set is_delete=1 where id=?`
  db.query(sql_update, req.params.id, (err, results) => {
    // 执行 SQL 语句失败
    if (err) return res.cc(err)
    // SQL 语句执行成功，但是影响行数不等于 1
    if (results.affectedRows !== 1) return res.cc('删除文章分类失败！')

    // 删除文章分类成功
    res.cc('删除文章成功！', 0)
  })
}

// 根据id更新文章的处理函数
exports.updateArticle = (req, res) => {
  // 手动判断是否上传了文章封面
  if (!req.file || req.file.fieldname !== 'cover_img')
    return res.cc('文章封面是必选参数！')
  // TODO：表单数据合法，继续后面的处理流程...
  // 导入处理路径的 path 核心模块
  const path = require('path')
  const articleInfo = {
    // 标题、内容、状态、所属的分类Id
    ...req.body,
    // 文章封面在服务器端的存放路径
    cover_img: path.join('/uploads', req.file.filename),
    // 文章发布时间
    pub_date: new Date(),
    // 文章作者的Id
    author_id: req.user.id
  }
  const sql_update = `update ev_articles set ? where id=?`

  // 执行 SQL 语句
  db.query(sql_update, [articleInfo, req.params.id], (err, results) => {
    // 执行 SQL 语句失败
    if (err) return res.cc(err)
    // 执行 SQL 语句成功，但是影响行数不等于 1
    if (results.affectedRows !== 1) return res.cc('更改文章失败！')
    res.cc('更改文章成功', 0)
  })
}

// 获取文章列表数据的处理函数
exports.getArticles = (req, res) => {
  // 根据文章的状态，获取所有未被删除的文章列表数据
  // is_delete 为 0 表示没有被 标记为删除 的数据
  const sql_select =
    'select title,cover_img,pub_date,state,cate_id from ev_articles where is_delete=0 order by id asc'
  db.query(sql_select, (err, results) => {
    // 1. 执行 SQL 语句失败
    if (err) return res.cc(err)
    // 2. 执行 SQL 语句成功
    res.send({
      status: 0,
      message: '获取文章分类列表成功！',
      data: results
    })
  })
}

// 根据id获取文章数据的处理函数
exports.getArticleById = (req, res) => {
  // 根据文章的状态和id，获取未被删除的文章数据
  const sql_select = 'select * from ev_articles where is_delete=0 and id=?'
  db.query(sql_select, req.params.id, (err, results) => {
    // 1. 执行 SQL 语句失败
    if (err) return res.cc(err)
    // 2. 执行 SQL 语句成功
    res.send({
      status: 0,
      message: '获取文章详情成功！',
      data: results
    })
  })
}
