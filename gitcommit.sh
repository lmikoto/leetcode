if [ -n "$(git status -s)" ];then
   echo "need push"
   git config --global user.email "lmikoto@outlook.com"
   git config --global user.name "lmikoto"
   git add .
   git commit -m 'update post'
   git push -f "https://${GITHUB_TOKEN}@github.com/lmikoto/leetcode.git" HEAD:main
fi
