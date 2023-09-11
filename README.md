此文档准确来说是开发完成后本人梳理总结的笔记，语言有些幼稚，整体结构略显不规范，还请海涵

# api_server 大事件后台项目解析

## 全局概览

        首先可以看到，整个项目的入口文件是 app.js，里面初始化了一个运行在本机 3007 端口的服务器
        然后是路由模块，路由模块分为两部分，一个是 router 文件夹下的 user.js、userinfo.js 等存放路由映射关系的模块，另一个 router_handler 存放每个路由对应的处理函数。
        为什么要这样做呢？你可以在 router 下清楚地看见每个路由以及各个路由的类型和作用，如果放入处理函数就显得太复杂了。
        通过路由也可以看出，本次项目主要有四个大部：
          user 模块，写的是与用户账号状态有关的 api，例如注册、登录；
          userinfo 模块，主要是账号信息的变更 api，例如重置密码，换头像等；
          artcate 模块，主要是文章分类的相关操作，例如上架一个新的分类，或者修改某个分类的名称等；
          article 模块，就是发布具体文章的模块
        接着就是db数据库模块，前面各个模块都已经拆分了，如果都写数据库连接对象想必太冗余了，不如单独抽离出来存放到db中，需要时直接引入数据库，就可以操作相应表格了
        然后是schema模块，存放的是表单数据的验证规则，例如密码要6-12位啦邮箱要有邮箱的样子等等，这样当格式要求有变动时好管理。可以看到下面有三个文件，分别对应文章分类、文章、用户，值得一提的是用户名称密码邮箱等本质都是用户信息，所以没必要分成user.js和userinfo两个文件了
        对了，还有config配置文件，里面存的是密钥和时限等配置信息，token要用
        最后是uploads模块，当然是托管静态资源的地方了

## app.js 初始化

        在构建基本的服务器框架后，就得着手细节上的处理：
        首先是跨域问题，通过引入cors中间件解决；
        然后是表单数据解析问题，这次表单数据除了发布文章其他都是application/x-www-form-urlencoded格式，于是app.use(express.urlencoded({ extended: false }))
        接着就是托管静态资源，让用户能看到图文，express.static("./uploads")
        仔细观察，你会发现每个接口处理函数很多时候send的都是有问题的情况，都是只有一种情况成功，其他send的都是因为各种问题，所以通过全局中间件的形式，在每个路由身上挂载一个res.cc，将send封装起来，具体看代码
        接着注意看，导入的路由有两种，一种是api开头的，一种是my开头的，my开头的代表是登录状态下使用的，于是都需要验证token，确定是本人操作，那怎样进行token认证呢？可以导入expressJWT中间件，后面具体介绍
        然后文件末尾你看到有一个全局错误级别中间件，这个在文档末尾讲解

## user 模块

        首先要在库中建立一个存储账号信息的表，有id用户名密码别名邮箱头像几个字段

### 注册接口：

        然后通过中间件的形式验证用户名和密码的格式，这样就不用自己在处理函数中写了，导入的中间件后面统一说明
        这样传到处理函数的数据就是符合规定格式的了，接着就是sql查重。
        这个时候你会发现一个很有意思的现象，所有的db.query处理函数都有if(err)就res.cc，id(影响长度不一样)就res.cc(某个原因")这两句，而所有的接口处理函数几乎都是这个流程，先验证数据，然后查重，然后插入或删除或更新
        查重过后，意味着当前的信息可以录入表中了。这个时候就引入了bcrypt模块进行密码加密，明文存储是不安全的，至于各种引入的第三方模块后面统一讲解，最后执行sql_insert语句录入即可

### 登录接口：

        同样的，经过中间件数据验证后，然后就查询表单，查到相同的用户名，就比对密码是否相同，因为表里的密码是加密的，用户这时候填的是明文，所以得又通过bcrypt的某个方法来比对。
        接着比对不一样就返回登录失败嘛，成功就执行下面操作，先将密码和头像剔除，剩下的属性组成一个对象用于生成token，密码是因为不安全，头像不加密是因为没用。
        token通过一个第三方模块的用法生成，里面包含了刚才那个对象和配置文件中的密钥以及token有效期。
        生成token之后呢，就返回给客户端，然后客户端在调用my/下的接口时都会携带这个token，后端通过token验证就知道了是谁在操作，
        值得注意的是，token生成后并不是直接传给客户端，而是前面拼接上"Bearer "，方便客户端调用。

## userinfo 模块

        这个模块封装了四个接口，一个获取用户信息，另外三个都是更新信息，从现在开始所有的路由都是my开头的，登录状态下执行的，所以都会经过app.js里面的token解析验证中间件验证token

### 获取用户的基本信息

        req 对象上的 user 属性，是 Token 解析中间件express-jwt帮我们挂载上去的，利用这个id来查询对应的用户信息并返回

### 更新用户的基本信息

        第一步都是全局中间件验证token以后都不说了，接着就是局部中间件根据验证规则对象验证用户提交的数据，通过后就是sql_update修改数据啦，注意这个只能修改别名和邮箱哦，不过有点没搞懂为什么还要携带个req.body.id，直接用req.user.id不更准确吗

### 重置密码

        一样的，通过中间件先验证新旧两条密码，然后查询用户是否存在，存在再看传的旧密码与库中密码是否相等，相等再将传的新密码加密替换掉旧密码

### 更新用户头像

        头像其实是存的一个base64格式的图片，还是先经过数据验证，再通过sql_update将对应id的用户头像更新掉

## artcate 模块

        还是先创建一个表，存储文章分类信息(id,分类名,别名,is_delete).接口大多都是增删改查嘛，都差不多。同样，这个模块都在/my/路径下，所以都会经历token验证

### 获取文章分类

        获取所有分类信息有个注意点，就是不能获取到已经被标记删除的条目，所以在sql_select语句中要加上where限定条件is_delete=0，其他的大体差不多，就db.query固定的那两句套进去嘛

### 新增文章分类

        新增必然就是要提交分类名和别名两个数据嘛，验证后，就要进行一个很复杂的数据库查重操作：
        const sql_select = `select * from ev_article_cate where name=? or alias=?`
        首先如果分类名被一条原分类占用，分类别名被另一条分类占用，那就是影响两条数据判断条件为results.length === 2
        如果只有一条数据，那也有三种情况，只有分类名被占用，只有分类别名被占用，两个都被占用，相应的就得res.cc("说明对应原因")
        只有返回数据为0条才说明没重复的，可以插入新分类

### 根据 id 删除文章分类

        注意这里是使用的动态拼接，id要通过req.params.id获取，然后利用update更新操作给分类打上is_delete标记

### 根据 id 获取文章分类

        id获取也是通过req.parmes，这里sql语句我自己加了个is_delete=0，更严谨些

### 根据 id 更新文章分类

        同样的，这个和新增文章分类一样需要提交分类名和分类别名到后端，自然和新增文章分类一样需要进行上面那些判断。
        const sql = `select * from ev_article_cate where Id!=? and (name=? or alias=?)`
        这个sql语句很有意思，首先得排除掉要更新的id分类，因为可能这次更新只是把别名从拼音改成英文，洋气一点，可以重复嘛。
        在解决上面的麻烦事后，自然就是update更新了

## article 模块

        首先还是创建一个文章表，字段有id，标题，内容，封面图片的路径，发布日期，发布状态，是否已删除，分类id和作者(当前登录账号)id
        自然数据要验证，就得有验证规则，只定义标题、分类Id、内容、发布状态 的验证规则即可，因为封面图片路径有专门的第三方模块操作，发布日期返回客户端时生成就行了，是否删除肯定否呀，作者id还是从req.user获取

### 发布文章接口

        然后就是了，这次数据是FormData格式的，所以用到了一个第三方模块，他解析数据，将文件类型的数据，解析并挂载到 req.file 属性中，将文本类型的数据，解析并挂载到 req.body 属性中，这个中间件用了后，也是要再用数据验证中间件的。

### 处理函数

        首先就要判断文章封面图片传没传过来，如果req.file没挂载文件，或者挂载的文件名不是cover_img，那就res.cc("没传封面图片")
        然后需要导入path模块，等会要用，接着创建一个对象articleInfo，编写后传入文章表中
        这个articleInfo自然要携带除了is_delete外的所有数据
        前面几个在接口响应时用户就传过来了，用...req.body扩展运算符接收
        然后发布日期一个new Date()就够了
        作者id就是当前登录账号id，req.user.id
        我们存入的封面图片只是路径而已，实际图片存在uploads文件夹中，存文章表多费空间呀，这个路径自然就是path.join(__dirname, "../uploads")
        存在一个问题，就是传递的封面图片名如果有中文multer获取的file.originalname就会是乱码，但依然可用，只不过存放后看不来名字是啥。后面我试了，multer就是解析formData格式数据的中间件，在它之前是获取不到req.body的，因为req.body就是它挂载的。所以想通过在multer之前把图片文件名转化为数字英文是不行的，除非再多用个中间件提前解析出req.body，这明显事倍功半。想通过schema中添加图片文件名验证规则更是痴人说梦，都说了multer之后才有req.body，验证数据必然在multer中间件后。唯一的办法就是前端发请求前就转化文件名，然后后端配合用个方法转化回来

## 导入的第三方插件

### express,cors,mysql

        express当然是用来构建服务器的啦,cors当然是解决跨域问题的啦,mysql在db中用到，用于在项目中能操作数据库

### bcryptjs

        user模块中，登录注册有关密码的地方都用到了，有两个方法

#### hashSync 加密

```js
// 对用户的密码,进行 bcrype 加密，返回值是加密之后的密码字符串
userinfo.password = bcrypt.hashSync(userinfo.password, 10)
```

#### compareSync 比对

```js
// 拿着用户输入的密码,和数据库中存储的密码进行对比
const compareResult = bcrypt.compareSync(userinfo.password, results[0].password)
```

### 数据验证 joi 与 @escook/express-joi

        在实际开发中，前后端都需要对表单的数据进行合法性的验证，而且，后端做为数据合法性验证的最后一个关口，在拦截非法数据方面，起到了至关重要的作用。
        单纯的使用 if...else... 的形式对数据合法性进行验证，效率低下、出错率高、维护性差。因此，推荐使用第三方数据验证模块，来降低出错率、提高验证的效率与可维护性，让后端程序员把更多的精力放在核心业务逻辑的处理上。

#### joi

        joi是用来定义验证规则的，它身上有很多方法，可以链式调用，具体用法去schema看

#### @escook/express-joi

        这个插件都在router里的接口用到，具体用处就是验证接口接收到的数据格式是否符合前面的验证规则，怎么用呢

##### 导入，在管理接口的文件里导入

```js
// 导入验证数据合法性的中间件
const expressJoi = require("@escook/express-joi")
```

##### 使用，以导入名作为函数名，对应验证规则对象作为参数，充当中间件

```js
// 注册新用户
// 1.在注册新用户的路由中，声明局部中间件，对当前请求中携带的数据进行验证
// 2.数据验证通过后，会把这次请求流转给后面的路由处理函数
// 3.数据验证失败后，终止后续代码的执行，并抛出一个全局的 Error 错误，进入全局错误级别中间件中进行处理
router.post("/reguser", expressJoi(reg_login_schema), userHandler.regUser)
```

### token 相关 jsonwebtoken 与 express-jwt

#### jsonwebtoken

        这个是用来生成token的，全项目只有登录api验证通过后，才会生成当前用户的token，然后返回给客户端

##### 首先处理用户信息对象

```js
// 剔除完毕之后，user 中只保留了用户的 id, username, nickname, email 这四个属性的值
const user = { ...results[0], password: "", user_pic: "" }
```

##### 然后创建 config.js 文件，存放密钥和 token 时效

```js
module.exports = {
	jwtSecretKey: "揪小鲁班脸蛋",
	expiresIn: "10h", // token 有效期为 10 个小时
}
```

##### 接着就在登录接口的处理函数文件中引入 jsonwebtoken 用于生成 token，当然同时使用到的还有密钥与时效

```js
// 用这个包来生成 Token 字符串
const jwt = require("jsonwebtoken")
// 导入配置文件
const config = require("../config")
```

##### 下一步就是生成 token 了,使用到 jsonwebtoken 的 sign 方法，丢进去三个参数：user,密钥,时效

```js
// 生成 Token 字符串
const tokenStr = jwt.sign(user, config.jwtSecretKey, {
	expiresIn: "10h", // token 有效期为 10 个小时
})
```

##### 将生成的 Token 字符串响应给客户端：

```js
res.send({
	status: 0,
	message: "登录成功！",
	// 为了方便客户端使用 Token，在服务器端直接拼接上 Bearer 的前缀
	token: "Bearer " + tokenStr,
})
```

#### express-jwt

        相对来说解析token就没那么复杂了，token就是用户在发起请求时携带的身份认证信息，我们后端通过中间件验证toekn后决定是否响应数据。
        由上可知，用户在登录后，客户端在除了登录注册两种请求外都会携带token供后端验证。在app.js中可以看到那两个访问前缀都是/api/，其他的都是/my/开头的，这也说明了/my/开头的请求都是登录后才有的。
        既然如此，那怎么验证token呢？我们就可以在app挂载一个全局中间件，其中限定条件/api/不用验证

##### 首先在 app.js 中导入解析 toekn 的中间件，命名为 expressJWT。不要和前面的 expressJoi 搞混了，那个是验证数据的，是局部中间件

```js
// 解析 token 的中间件
const expressJWT = require("express-jwt")
```

##### 然后想想，你解析 token 不也得用密钥吗，所以

```js
// 导入配置文件，供解析token的中间件使用
const config = require("./config")
```

##### 接着就是挂载全局解析 token 的中间件了

```js
/* 下面是固定写法，expressJWT是个函数，参数为一个对象，对象的secret属性就是填入密钥，再写个algorithms: ["HS256"]属性，然后链式调用unless方法，使用 .unless({ path: [/^\/api\//] }) 指定api接口不需要进行 Token 的身份认证 */
app.use(
	expressJWT({ secret: config.jwtSecretKey, algorithms: ["HS256"] }).unless({
		path: [/^\/api\//],
	})
)
```

### multer

        最后一个接口是发布文章，用户提交的数据因为包含封面图片文件，所以得用FormData格式的数据传输。
        这就有个问题了，express.urlencoded({ extended: false })不能解析呀，于是就得引入multer解析 multipart/form-data 格式的表单数据。

#### 于是我们就该在发布文章的路由管理文件中配置 multer 局部中间件

```js
// 导入解析 formdata 格式表单数据的包
const multer = require("multer")
// 导入处理路径的核心模块
const path = require("path")

/*这个配置对象原来是很简短的一句，通过 dest 属性指定文件的存放路径
const upload = multer({ dest: path.join(__dirname, '../uploads') })
但是这样我发现生成的图片文件名是随机的并且没后缀名，于是我自己查文档改成下面那种 */

/* 创建 multer 的实例对象，通过 destination 属性指定文件的存放路径,filename指定文件存放名为file.originalname，这个file.originalname就是文件上传时在你计算机里的文件名
值得注意的是，这个插件接收到文件后如果文件名包含中文，解析出来的计算机文件名file.originalname就会是乱码，不过也可以使用，当然最好是用英文命名了来 ，当然这里有更好的办法
所以这里我使用文章标题拼接文件类型作为资源文件名，非常完美且合理，为我的机智点赞！
*/
const storage = multer.diskStorage({
	destination: path.join(__dirname, "../uploads"),
	filename: function (req, file, cb) {
		cb(
			null,
			`${req.body.title}.${file.mimetype.slice(file.mimetype.lastIndexOf("/") + 1)}`
		)
	},
})
const upload = multer({ storage })
```

#### 在发布新文章 的路由插入如下中间件

```js
// 发布新文章的路由
// 注意：在当前的路由中，先后使用了两个中间件：
/* 	先使用 multer 解析表单数据
 *	upload.single() 是一个局部生效的中间件，用来解析 FormData 格式的表单数据
 *	将文件类型的数据，解析并挂载到 req.file 属性中
 *	将文本类型的数据，解析并挂载到 req.body 属性中
 *      upload.single()里的参数自然就是上传文件的键名，我们这里当然就是"cover_img"封面文件了
 */
//  再使用 expressJoi 对multer解析的表单数据进行验证
router.post(
	"/add",
	upload.single("cover_img"),
	expressJoi(add_article_schema),
	article_handler.addArticle
)
```

### 插件总结

```js
"dependencies": {
    "@escook/express-joi": "^1.1.1",//          参数内写入验证规则对象，作为中间件验证表单数据
    "bcryptjs": "^2.4.3",//                     密码相关，可以加密密码，也可以比对密码
    "cors": "^2.8.5",//                         解决跨域问题
    "express": "^4.17.1",//                     构建基本服务器用到
    "express-jwt": "^5.3.3",//                  解析并验证token的
    "joi": "^17.6.0",//                         用于在schema定义验证规则对象
    "jsonwebtoken": "^8.5.1",//                 在登录接口生成token的
    "multer": "^1.4.2",//                       解析FormData数据的，并处理上传的图片文件
    "mysql": "^2.18.1"//                        当然就是用于操作数据库了
  }
```

## 全局错误级中间件

        以上我们可以看到，有许多地方都会抛出错误，比如验证表单数据的时候，还有验证token的时候，以及其他各种错误
        所以我们有必要定义一个全局的错区级别中间件来处理这些错误

        在 app.js 末尾注入如下代码：

```js
// 错误中间件
const joi = require("joi")
app.use(function (err, req, res, next) {
	// 数据验证失败
	if (err instanceof joi.ValidationError) return res.cc(err)
	// 捕获身份认证失败的错误
	if (err.name === "UnauthorizedError") return res.cc("身份认证失败！")
	// 未知错误
	res.cc(err)
})
```

        其中的数据验证我也不知道为啥这样写，依葫芦画瓢就对了。甚至你看嘛，有它没它不都抛出res.cc(err)吗，那何必加判断呢。
        不过捕获身份认证失败的错误我倒知道，如果token语法错误或者过期，返回客户端的错误就是以UnauthorizedError开头的，所以以此判断是哪种错误

## 尾声

        啊，终于写完了，创建这个项目的文档也在根目录里，Node.js结束！！！
