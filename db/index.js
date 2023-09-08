// 导入 mysql 模块
const mysql = require('mysql')

// 创建数据库连接对象
const db = mysql.createPool({
  host: '127.0.0.1',
  user: 'root',
  password: 'admin123',
  database: 'my_db_01'
})

// 'select 1'语句就是用来检测数据库模块是否可以正常工作的
db.query('select 1', (err, res) => {
  if (err) console.log(err.message)
  else console.log(res)
})

// 向外共享 db 数据库连接对象
module.exports = db
