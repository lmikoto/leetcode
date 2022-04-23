'use strict';

const superagent = require('superagent');
const { formatRaw } = require('yuque-hexo/util');
const getEtag = require('yuque-hexo/lib/qetag');
const out = require('yuque-hexo/lib/out');
const fs = require('fs')

// 获取语雀的图片链接的正则表达式
const imageUrlRegExp = /!\[(.*?)]\((.*?)\)/mg;
const imageDirName = 'post/images'



/**
 * 从markdown格式的url中获取url
 *
 * @param {string} markdownImgUrl markdown语法图片
 * @return {string} 图片url
 */
 function getImgUrl(markdownImgUrl) {
  const _temp = markdownImgUrl.replace(/\!\[(.*?)]\(/, '');
  const _temp_index = _temp.indexOf(')');
  // 得到真正的语雀的url
  return _temp.substring(0, _temp_index)
    .split('#')[0];
}


/**
 * 根据文件内容获取唯一文件名
 *
 * @param {Buffer} imgBuffer 文件buffer
 * @param {string} yuqueImgUrl 语雀图片url
 * @return {Promise<string>} 图片文件名称
 */
 async function getFileName(imgBuffer, yuqueImgUrl) {
  return new Promise(resolve => {
    getEtag(imgBuffer, hash => {
      const imgName = hash;
      const imgSuffix = yuqueImgUrl.substring(yuqueImgUrl.lastIndexOf('.'));
      const fileName = `${imgName}${imgSuffix}`;
      resolve(fileName);
    });
  });
}


/**
 * 将图片转成buffer
 *
 * @param {string} yuqueImgUrl 语雀图片url
 * @return {Promise<Buffer>} 文件buffer
 */
 async function img2Buffer(yuqueImgUrl) {
  return await new Promise(async function(resolve) {
    try {
      await superagent
        .get(yuqueImgUrl)
        .buffer(true)
        .parse(res => {
          const buffer = [];
          res.on('data', chunk => {
            buffer.push(chunk);
          });
          res.on('end', () => {
            const data = Buffer.concat(buffer);
            resolve(data);
          });
        });
    } catch (e) {
      out.warn(`invalid img: ${yuqueImgUrl}`);
      out.warn(e)
      resolve(null);
    }
  });
}


/**
 * 将article中body中的语雀url进行替换
 * @param {*} article 文章
 * @return {*} 文章
 */
 async function imgDownload(article) {
  // 1。从文章中获取语雀的图片URL列表
  const matchYuqueImgUrlList = article.body.match(imageUrlRegExp);
  if (!matchYuqueImgUrlList) return article;
  const promiseList = matchYuqueImgUrlList.map(async matchYuqueImgUrl => {
    // 获取真正的图片url
    const yuqueImgUrl = getImgUrl(matchYuqueImgUrl);
    // 2。将图片转成buffer
    const imgBuffer = await img2Buffer(yuqueImgUrl);
    if (!imgBuffer) {
      return {
        originalUrl: matchYuqueImgUrl,
        yuqueRealImgUrl: yuqueImgUrl,
        url: yuqueImgUrl,
      };
    }
    // 3。根据buffer文件生成唯一的hash文件名
    const fileName = await getFileName(imgBuffer, yuqueImgUrl);

    try {
      if(!fs.existsSync(imageDirName)){
        fs.mkdirSync(imageDirName)
      }

      fs.writeFileSync(`${imageDirName}/${fileName}`,imgBuffer)
      return {
        originalUrl: matchYuqueImgUrl,
        yuqueRealImgUrl: yuqueImgUrl,
        url: `../${imageDirName}/${fileName}`,
      };
    } catch (e) {
      out.error(`访问图床出错，请检查配置: ${e}`);
      process.exit(-1);
    }
  });
  const urlList = await Promise.all(promiseList);
  urlList.forEach(function(url) {
    if (url) {
      article.body = article.body.replace(url.originalUrl, `![](${url.url})`);
      out.info(`replace ${url.yuqueRealImgUrl} to ${url.url}`);
    }
  });
  return article;
}


/**
 * markdown 文章生产适配器
 *
 * @param {Object} post 文章
 * @return {String} text
 */
module.exports = async function(post) {
  // 语雀img下载
  post = await imgDownload(post);
  const { body } = post;
  const raw = formatRaw(body);
  return raw;
};