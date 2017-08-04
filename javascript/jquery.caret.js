require.define("jQueryCaret", function($) {
	var protectObject = function(obj) {
		if ("defineProperty" in Object) {
			var newObj = {};
			for (var x in obj) {
				if (obj.hasOwnProperty(x)) {
					Object.defineProperty(newObj, x, {
						value: obj[x],
						writable: false,
						enumerable: true
					});
				}
			}
			return newObj;
		}
		return obj;
	};

	var caretTo = function(element, start, end) {
		if (typeof end === "undefined") {
			end = start;
		} else if (start > end) {
			var a = start;
			start = end;
			end = a;
		}
		start = (0 <= start) ? start : 0;
		end = (0 <= end) ? end : 0;

		if ("contentEditable" in element || ["INPUT", "TEXTAREA"].indexOf(element.tagName) === -1) {
			var rng = document.createRange(),
				sel = window.getSelection(),
				n, o = 0,
				tw = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, null),
				textNodes = [];

			while (n = tw.nextNode())
				textNodes.push(n);

			n = textNodes[textNodes.length - 1];

			if (start !== "end" || end !== "end") {
				for (var i = 0; i < textNodes.length; i++) {
					n = textNodes[i];
					o += n.nodeValue.length;
					if (start !== "end" && o > start) {
						rng.setStart(n, n.nodeValue.length + start - o);
						start = Infinity;
					}
					if (end !== "end" && o >= end) {
						rng.setEnd(n, n.nodeValue.length + end - o);
						break;
					}
				}
			}

			((start === "end" || (start !== Infinity && start > o)) && rng.setStart(n, n.nodeValue.length));
			((end === "end" || (start !== end && end > o)) && rng.setEnd(n, n.nodeValue.length));
			(start == end && rng.collapse(false));

			sel.removeAllRanges();
			sel.addRange(rng);
		} else {
			var endPos = element.value.length;
			element.setSelectionRange((start === "end") ? endPos : start, (end === "end") ? endPos : end);
		}

		return this;
	};

	function getWord(text, pos, c) {
		for (var i = 0, length = 0, a = 0, match = [], t = (text || "").split(" "); i < t.length; i++) {
			length += a = 1 + t[i].length;
			if (pos <= length) {
				match = (t[i].replace(/\s+/g, "") !== "") ? [text.substr(0, length - a), t[i]] : null;
				return (c || !match) ? match : match[1];
			}
		}
	}

	function replaceWord(replace, first) {
		replace = (replace instanceof Array) ? replace : [replace];

		if ((typeof first === "undefined" || first) && this.three.length > 1) {
			return false;
		}

		if (typeof this.word === "undefined" || this.word === null) {
			if (!this.node.nodeValue)
				$(this.node).text(replace);
			return false;
		}

		var a = false,
			diff = 0;
		if (!this.cMode) {
			var text = this.node.nodeValue,
				start = text.substr(0, this.wordStartNode);

			this.node.replaceData(0, start.length + (this.word + "").length, "");
			(start !== "") && this.node.parentNode.insertBefore(createFragment(start), this.node);
			this.node.parentNode.insertBefore(createFragment.apply(this, replace), this.node);
			(this.node.nodeValue === "" && !(this.node instanceof HTMLElement)) && this.node.parentNode.removeChild(this.node);

			diff = (this.word) ? createFragment.apply(this, replace).textContent.length - this.word.length : 0;
			a = true;
		} else {
			var text = this.target.value,
				start = text.substr(0, this.wordStartNode),
				middle = replace.join(" "),
				end = text.substr(this.wordStartNode + this.word.length, this.target.value.length);

			this.target.value = start + middle + end;

			diff = (this.word) ? middle.length - this.word.length : 0;
			a = true;
		}

		caretTo(this.target, this.start + diff, this.end + diff);

		return a;
	}

	function createFragment() {
		var f = document.createDocumentFragment();
		for (var i = 0, element, b; i < arguments.length; i++) {
			element = arguments[i];

			if (!element) {
				continue;
			}

			try {
				b = (element instanceof jQuery) ? element.clone(true)[0] : $(element)[0];
			} catch (e) {
				b = null;
			}

			f.appendChild((b) ? b : $(document.createTextNode(element))[0])
		}
		return f;
	};

	var caretPos = function(element) {
		var fosused = document.activeElement;
		element.focus();

		if (!("contentEditable" in element) && ["INPUT", "TEXTAREA"].indexOf(element.tagName) !== -1) {
			var match = getWord(element.value, element.selectionStart, true);

			fosused.focus();

			return {
				start: element.selectionStart,
				end: element.selectionEnd,
				target: element,
				node: null,
				nodeStart: null,
				nodeEnd: null,
				three: [element],
				word: (!match) ? null : match[1],
				wordStart: (!match) ? null : match[0].length,
				wordStartNode: (!match) ? null : match[0].length,
				replaceWord: replaceWord,
				cMode: true
			};
		}

		var caret = {},
			doc = element.ownerDocument || element.document,
			win = doc.defaultView || doc.parentWindow,
			sel = win.getSelection(),
			range = (sel.rangeCount !== 0) ? sel.getRangeAt(0) : null,
			preCaretRange = (range) ? range.cloneRange() : null,
			a = null,
			match = null,
			length = 0;

		if (range === null) {
			console.warn("Warning : (" + ((sel.rangeCount === 0) ? "rangeCount === 0" : "range === null") + "). Maybe, it's focus issue.", $(":focus")[0]);
			return false;
		}

		range = window.getSelection().getRangeAt(0);
		preCaretRange = range.cloneRange();

		preCaretRange.selectNodeContents(element);
		preCaretRange.setEnd(range.startContainer, range.startOffset);
		caret.start = preCaretRange.toString().length;

		preCaretRange.setEnd(range.endContainer, range.endOffset);
		caret.end = preCaretRange.toString().length;

		caret.node = (!(caret.node instanceof HTMLElement)) ? range.startContainer : element.childNodes[0];
		caret.nodeStart = range.startOffset;
		caret.nodeEnd = range.endOffset;
		caret.target = element;

		caret.three = [];
		a = caret.node;
		while (a !== element && a !== element.parentNode && (a = a.parentNode) !== null && a !== element && caret.three.push(a));
		caret.three.reverse();

		do {
			do {
				a = null;

				while (caret.node instanceof HTMLElement) {
					a = caret.node;
					caret.node = caret.node.childNodes[0];
				}

				if (typeof(caret.node) === "undefined" && a) caret.node = a;
				if (typeof(caret.node) === "undefined") return false;

				if (caret.three[caret.three.length - 1] !== caret.node.parentNode) {
					caret.three.push(caret.node.parentNode);
				}

				a = caret.node;
				if (a.nodeValue === "" && a.nodeValue.length <= caret.nodeStart) {
					caret.node = (a.parentNode.children[0]) ? a.parentNode.children[0].childNodes[0] : a.nextSibling;
				} else {
					break;
				}
			} while (true);

			match = getWord(caret.node.nodeValue, caret.nodeStart, true);
			caret.word = (!match) ? null : match[1];
			caret.wordStartNode = (!match) ? null : match[0].length;
			caret.wordStart = (function() {
				var previousElement = caret.node,
					previousLength = 0;

				while (previousElement = previousElement.previousSibling)
					previousLength += (previousElement.nodeValue) ? previousElement.nodeValue.length : 0;

				return previousLength;
			}(caret.node)) + caret.wordStartNode;
			caret.replaceWord = replaceWord;

			if ((caret.nodeStart === 0 || (caret.nodeStart === 1 && caret.node.nodeValue && caret.node.nodeValue[0] === " "))) {
				a = caret.node.previousSibling;

				if (a === null || a === element.previousSibling) break;
				caret.node = a;

				if (caret.node.childNodes[0] && caret.node.childNodes[0].nodeValue) {
					length = caret.node.childNodes[0].nodeValue.length;
					caret.nodeStart += length;
					caret.nodeEnd += length;
				}
			} else {
				break;
			}
		}
		while (true);

		fosused.focus();
		//console.info(caret);
		return caret;
	};

	$.fn.caret = function(start, end) {
		if (!("contentEditable" in this[0]) && ["INPUT", "TEXTAREA"].indexOf(this[0].tagName) !== -1) {
			console.warn("Compatibility mode.");
		}
		if (typeof(start) === "undefined") {
			return protectObject(caretPos(this[0]));
		}
		if (typeof(start) === "object" && typeof(end) === "undefined") {
			end = start.end;
			start = start.start;
		}

		return caretTo.call(this, this[0], start, end);
	};
});