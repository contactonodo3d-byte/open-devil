/* Development migration: wrap presentation writes without changing simulation IDs. */
const fs=require('fs'),acorn=require('acorn'),walk=require('acorn-walk');
for(const file of ['js/ui.js','js/main.js']){
 const source=fs.readFileSync(file,'utf8'),edits=[];
 walk.simple(acorn.parse(source,{ecmaVersion:'latest'}),{
  AssignmentExpression(n){
   const left=n.left;if(left.type!=='MemberExpression'||left.computed||n.operator!=='=')return;
   const property=left.property.name;if(!['textContent','innerHTML','title'].includes(property))return;
   const raw=source.slice(n.right.start,n.right.end);if(raw.startsWith('window.I18n.'))return;
   edits.push({start:n.right.start,end:n.right.end,value:`window.I18n.${property==='innerHTML'?'html':'text'}(${raw})`});
  },
  CallExpression(n){
   if(n.callee.type!=='MemberExpression'||n.callee.property.name!=='setAttribute'||!['aria-label','title','placeholder'].includes(n.arguments[0]?.value))return;
   const argument=n.arguments[1];if(!argument)return;
   const raw=source.slice(argument.start,argument.end);if(raw.startsWith('window.I18n.'))return;
   edits.push({start:argument.start,end:argument.end,value:`window.I18n.text(${raw})`});
  }
 });
 let result=source;for(const edit of edits.sort((a,b)=>b.start-a.start))result=result.slice(0,edit.start)+edit.value+result.slice(edit.end);
 acorn.parse(result,{ecmaVersion:'latest'});fs.writeFileSync(file,result);
}
