'use strict';

const fs = require('fs')
const _ = require('lodash')
const out = require('yuque-hexo/lib/out');


const ERROR_CODE = 255
const postPath = 'post'

const categoryStart = '<!-- categoryStart -->'
const categoryEnd = '<!-- categoryEnd -->'

const postNames = fs.readdirSync(postPath)

if(_.isEmpty(postNames)){
  process.exit(ERROR_CODE)
}


const categoryMap = {} 

_.forEach(postNames,name=>{
  const stat = fs.lstatSync(`${postPath}/${name}`)
  if(stat.isDirectory()){
    return
  }
  const content = fs.readFileSync(`${postPath}/${name}`,'utf-8')
  if(_.isEmpty(content)){
    return
  }

  const categoriesLine = content.trim().split('\n')[0]

  if(_.isEmpty(categoriesLine)){
    return
  }
  const categories = categoriesLine.replace("> ","").trim().split(" ")
  if(_.isEmpty(categories)){
    return
  }

  _.forEach(categories,category=>{
    if(_.has(categoryMap,category)){
      categoryMap[category].add(name)
    }else{
      categoryMap[category] = new Set()
      categoryMap[category].add(name)
    }
  })
})

if(_.isEmpty(categoryMap)){
  process.exit(ERROR_CODE)
}

let categoriesStr = ''
_.forEach(categoryMap,(categoriesSet,category)=>{
  const categoriesArr = Array.from(categoriesSet)
  categoriesArr.sort((c1,c2)=>{
    const num1 = c1.split('.')[0]
    const num2 = c2.split('.')[0]
    return Number(num1) - Number(num2)
  })
  categoriesStr += `### ${category}  \n`
  _.forEach(categoriesArr,postName=>{
    categoriesStr += `[${postName}](post/${postName})  \n`
  })
})


const readme = fs.readFileSync('README.md','utf-8')

const startIndex = readme.indexOf(categoryStart)
const endIndex = readme.indexOf(categoryEnd)


const newReadme = readme.slice(0,startIndex + categoryStart.length) + '\n' + categoriesStr + '\n' + readme.slice(endIndex)

fs.writeFileSync('README.md',newReadme)






