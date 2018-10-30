
var mysql = require('mysql')
var config = require('../config/default.js')
const _ = require('underscore')
const xl = require("excel4node")
const moment = require('moment')

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
  let filter = '1 = 1' 
  let beginTime = ''
  let endTime = ''
  let timeFilter = ''
  // 这里values.filter取到的是字符串 需要转换成对象
  console.log('values,', values, 'values.filter', values.filter)
  if (values.filter && !_.isEmpty(JSON.parse(values.filter))) {
    console.log('values.filter', JSON.parse(values.filter))
     //由JSON字符串转换为JSON对象
    let jsonFilter = JSON.parse(values.filter)
    for (var key in jsonFilter) {
      // console.log(key);     //获取key值
      // console.log(jsonFilter[key]); //获取对应的value值
      // 根据filter拼接语句
      filter = key + ' in (' + jsonFilter[key] + ')'
    }
  }
  console.log('filter', filter, 'values.timeRange',values.timeRange)
  // 返回空数组是["",""]的格式 暂时不知道怎么转空数组
  if (values.timeRange !== '["",""]' && !_.isEmpty(values.timeRange)) {
    let time = JSON.parse(values.timeRange)
    beginTime = time[0]
    endTime = time[1]
    timeFilter = ` and create_time BETWEEN '${beginTime} 00:00:00' and '${endTime} 23:59:59'`
  }

  if(!(values.limit === '0' && values.offset === '0')){
    whereStr = ` limit ${values.limit}, ${values.offset}`
  }
  _sql = `SELECT * from test_book where `+ filter + timeFilter + whereStr
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

let downloadExecel = async (values, ctx) => {
  // nodejs连接MySQL返回的数据有RowDataPacket问题 需要转成json格式
  let r = await pageData(values)
  var dataString = JSON.stringify(r);
  var data = JSON.parse(dataString)
  let wb = new xl.Workbook()
  let ws = wb.addWorksheet("Sheet 1")
  ws.cell(1, 1).string("名字")
  ws.cell(1, 2).string("描述")
  ws.cell(1, 3).string("创建时间")
  for (let i in data) {
    let index = +i + 2
    let row = data[i]
    // 第一个参数代表列 第二个代表行
    ws.cell(index, 1).string(row.name + '')
    ws.cell(index, 2).string(row.description + '')
    ws.cell(index, 3).string(moment(row.create_time).format("YYYY-MM-DD hh:mm:ss") + '')
  }
  // 设置行宽
  ws.column(1).setWidth(50)
  ws.column(2).setWidth(80)
  ws.column(3).setWidth(90)
  // 设置列高度
  ws.row(1).setHeight(80);


  ctx.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  ctx.set('Character-Encoding', 'utf-8')
  let fileName = `试试`
  ctx.set("Content-Disposition", `attachments; filename=${encodeURIComponent(fileName)}.xlsx`)
  return wb.writeToBuffer()
}
module.exports = {
  findDataById,
  registerUser,
  findName,
  loginUser,
  pageData,
  updateUser,
  downloadExecel
}