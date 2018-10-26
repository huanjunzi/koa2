
var mysql = require('mysql')
var config = require('../config/default.js')
const _ = require('underscore')
// 创建数据库连接池
var pool  = mysql.createPool({
  host     : config.database.HOST,
  user     : config.database.USERNAME,
  password : config.database.PASSWORD,
  database : config.database.DATABASE
})

let query = ( sql, values ) => {
  return new Promise(( resolve, reject ) => {
    pool.getConnection(function(err, connection) {
      if (err) {
        resolve( err )
      } else {
        // console.log("sql=",sql, "values=",values)
        console.log('sql=-=', sql)
        connection.query(sql, values, ( err, rows) => {
          if ( err ) {
            reject( err )
          } else {
            resolve( rows )
          }
          connection.release()
        })
      }
    })
  })

}

let findDataById = (id) => {
  let _sql = `SELECT * from test_book where id="${id}"`
  return query( _sql)
}
// 注册用户
let registerUser = (values) => {
  console.log('register=', values)
  let _sql = "insert into test_book set name=?,description=?,create_time=?,update_time=?;"
  return query( _sql, values )
}

// 查找重复名字的用户
let findName = (name) => {
  let _sql = `SELECT 1 from test_book where name="${name}"`
  return query( _sql)
}

// 用户登录
let loginUser = (values) => {
  let _sql = `SELECT * from test_book where name=? and description=?`
  return query( _sql, values)
}

// 分页查询
let pageData = (values) => {
  let _sql
  let whereStr = ''
  let filter = '1 = 1 '
  if (!_.isEmpty(values.filter)) {
     //由JSON字符串转换为JSON对象
    let jsonFilter = JSON.parse(values.filter)
    for (var key in jsonFilter) {
      // console.log(key);     //获取key值
      // console.log(jsonFilter[key]); //获取对应的value值
      // 根据filter拼接语句
      filter = key + ' in (' + jsonFilter[key] + ')'
    }
  }
  console.log('filter', filter)
  if(!(values.limit === '0' && values.offset === '0')){
    whereStr = ` limit ${values.limit}, ${values.offset}`
  }
  _sql = `SELECT * from test_book where `+ filter + whereStr
  return query( _sql)
}

// 更新用户信息
let updateUser = async (values, name, description) => {
  for (let data of values) {
    let arrStr = []
    arrStr.push(data.id , name, description)
    let _sql = `INSERT INTO test_book (id,name,description) VALUES (?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),description=VALUES(description)`
    await query(_sql, arrStr)
  }
  return [{ success: 'success'}]
  // let _sql = `INSERT INTO test_book (id,name,description,origin_price,price,stock) VALUES 
  // (?,?,?,?,?,?)
  // ON DUPLICATE KEY UPDATE name=VALUES(name),description=VALUES(description),origin_price=VALUES(origin_price),price=VALUES(price),stock=VALUES(stock)`
}
module.exports = {
  findDataById,
  registerUser,
  findName,
  loginUser,
  pageData,
  updateUser
}