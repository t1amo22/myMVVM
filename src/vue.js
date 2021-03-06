function vue(oop) {
	var node = document.querySelector(oop.el);
	var data = oop.data;
	var methods = oop.methods;
	var vueArr = ['s-text', 's-show', 's-if', 's-model', 's-for'];//指令存储数组

	this.cache = [];

	this.addQuene = function(nodes) {
		var that = this;
		if (nodes.nodeType == 1) {
			this.cache.push(nodes);
			if (nodes.hasChildNodes()) {
				nodes.childNodes.forEach(function(item) {
					that.addQuene(item);	//递归实现所有的节点复制
				});
			}
		}
	};


	this.compile = function(dom) {
		this.addQuene(dom);
	};

	this.muscha = function(value) {
		var temp = {
			string: [],
			text: [],
			tag: 0
		};

		var reg = /\{\{((?:.|\\n)+?)\}\}/g;

		if (!reg.test(value)) {
		    	return null;
		}

		var match;
		
		var lastIndex = reg.lastIndex = 0;
		var index;

		while(match = reg.exec(value)) {
			
			index = match.index;

			if (index > lastIndex) {
				temp.tag = 1;
				temp.string.push(value.slice(lastIndex, index));
			}
		
 			temp.text.push(match[1]);
			lastIndex = index + match[0].length;
		}
		
		if (lastIndex < value.length) {
			temp.string.push(value.slice(lastIndex));
		}
		return temp;
	}

	this.pasers = function() {
		var that = this;
		
		this.cache = this.cache.map(function(node) {
			var temp = {node: node};
			if(node.childNodes.length === 1 && node.childNodes[0].nodeType === 3) {
				temp.muscha = that.muscha(node.innerHTML);	
			}

			if (node.parentNode !== that.cache[0]) {
				temp.parentNode = node.parentNode;
			}
			
			vueArr.forEach(function(attr) {
				if (node.getAttribute(attr)) {
					temp[attr] = node.getAttribute(attr);
					if (attr === 's-model') {
						node.addEventListener('input', change);	//监听input值，实现data的双向改变
					}
				}
				
				function change() {
					data[node.getAttribute(attr)] = event.target.value;
				};
			});

			var attributes = node.attributes;
			attributes = [].slice.call(attributes);
			var reg = /(\@)|(s-on:)/g;
			temp.event = [];
			for (var i = 0; i < attributes.length; i++) {
				if (reg.test(attributes[i].name)) {
					var len = attributes[i].name.match(reg)[0].length;
					var type = attributes[i].name.substring(len);
					temp.event.push({type: type, event: attributes[i].value});
				}
			}
			return temp;
		});
	};

	this.strSplit = function(item) {
		var str = '';

		if (!item.muscha.tag) {
			var len = item.muscha.string.length;
			switch(len) {
				case 0:
					for (var i = 0; i < item.muscha.text.length; i++) {
						str += data[item.muscha.text[i]];
					}
					break;
				case 1:
					str = data[item.muscha.text[0]] + item.muscha.string[0];
					break;
				default:
					for (var i = 0; i < len; i++) {
						str = data[item.muscha.text[i]] + item.muscha.string[i];
					}
					str += data[item.muscha.text[i]];
			}
		} else {
			var len = item.muscha.text.length;
			switch(len) {
				case 1:
					//console.log(data[item.muscha.text[0]]);
					str = item.muscha.string[0] + data[item.muscha.text[0]];
					break;
				default:
					for (var j = 0; j < len; j++) {
						str = item.muscha.string[j] + data[item.muscha.text[j]];
					}
					str += item.muscha.string[j];
			}
		}
		return str;	
	}

	this.toChange = function(item, attr, content) {
		var node = item.node;
		var that = this;
		switch(attr) {

			case 's-text':
				node.innerHTML = content;
				break;

			case 's-show':
				if (content) {
					node.style.display = 'block';
				} else {
					node.style.display = 'none';
				}
				break;

			case 's-if':
				if (content) {
					if (!node) {
						node.insertBefore(node, node.nextSbling);
					}
				} else {
					node.parentNode.removeChild(node);
				}
				break;

			case 's-model':
				node.value = content;
				break;

			case 's-for':
				var items = data[item.list];
				var fragment = document.createDocumentFragment();
				if (content) {
					for (var i = 0, len = items.length; i < len; i++) {
						var dom = document.createElement(item.node
							.nodeName.toLowerCase());
						dom.innerHTML = items[i][content];
						if (item.event) {
							for (var j = 0; j < item.event.length; j++) {
								dom.addEventListener(item.event[j].type, that.eventProcess(methods[item.event[j].event]), false);
							}
						}
						fragment.appendChild(dom);
					}
					if (item.parentNode) {
						var dom = document.createElement(item.node
							.nodeName.toLowerCase());
						item.parentNode.innerHTML = '';
						item.parentNode.appendChild(fragment);
					} else{
						if (item.nextElementSibling === undefined) {
							item.nextElementSibling = item.node.nextElementSibling;
							if (item.node.nextElementSibling === null) {
								item.node.parentNode.insertBefore(fragment, item.node);
								//console.log(item.node.parentNode.lastElementChild);
								item.node.parentNode.removeChild(item.node.parentNode.lastElementChild);
							} else { 
								item.node.nextElementSibling.parentNode.insertBefore(fragment, item.node);
								item.node.nextElementSibling.parentNode.removeChild(item.node);
							}
						}
					}
				}
				break;

		};
	};

	this.render = function() {
		//分别实现
		var that = this;

		this.cache.forEach(function(item) {
			
			vueArr.forEach(function(attr) {
				if (item[attr]) {
					var content = data[item[attr]];
					//console.log(attr);
					if (attr === 's-for') {
						var value = item[attr].replace(/(^\s*)|(\s*$)/g, '');
						var arr = value.split(' ');
						var list = item.seralize ? item.seralize : item.seralize = that.muscha(item.node.innerHTML);
					
						if (arr.length > 1) {
							var compaire = arr[0];
							item.list = arr[2];
							var str = /[\w]*\./.exec(list.text[0])[0];
							str = str.slice(0, str.length-1);
							if (compaire === str) {
								content = (/\.[\w]*/.exec(list.text[0]))[0].substring(1);
								//console.log(content);
							} else {
								content = '';
							}
						}
					}
					that.toChange(item, attr, content);
				}
			});

			if (item.muscha) {
				item.node.innerHTML = that.strSplit(item);
			}
			if (item.event) {
				for (var i = 0; i < item.event.length; i++) {
					//console.log(methods[item.event[i].event]);
					item.node.addEventListener(item.event[i].type, that.eventProcess(methods[item.event[i].event]), false);
				}
			}
		});
	};

	this.eventProcess = function(fn) {

		return fn.bind(oop);
	}

	this.watch = function(obj, callback) {
		this.$observeObj = function() {
			var that = this;
			this.callback = callback;
			//console.log(Object.keys(obj));
			Object.keys(obj).forEach(function(prop) {
				var val = obj[prop];
				Object.defineProperty(obj, prop, {
					get: function() {
						return val;
					},
					set: function(newVal) {
						var temp = val;
						//console.log(newVal);
						val = newVal;
						//通知所有订阅者改变
						
						that.cache.forEach(function(item) {
							if (item[prop]) {
								item[prop] = newVal;
							}
						});
						that.callback();
					},    
					enumerable: true,
    				configurable: true
				});
			});
		}

		this.$observeObj();
	};

	this.observe = function() {
		this.watch(data, this.render);
	};

	this.init = function() {
		this.compile(node);
		//console.log(this.cache);
		this.pasers();
		console.log(this.cache);
		this.observe();
		this.render();
	};

	this.init();
}