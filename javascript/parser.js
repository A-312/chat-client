require.define("parser", {
	parseHTML2TEXT: function(text) {
		var a = 0,
			$div;
		text = text.replace(/<br>/g, "\n");
		text = text.replace(/\s+$/g, "");

		$div = $("<div></div>").html(text);

		/*a = 0;
		$div.find("img").each(function() {
			var c = "[img]" + $(this).attr("src") + "[/img]";
			a++;
			$(this).after((a <= 4) ? document.createTextNode(c) : "");
		});*/

		text = $div.text();

		return text;
	},
	parseTEXT2HTML: function(text, opt) {
		var a = 0;
		opt = (opt) ? opt : {};

		text = text.replace(/&/g, "&amp;");
		text = text.replace(/</g, "&lt;");
		text = text.replace(/>/g, "&gt;");
		text = text.replace(/\n\s*\n/g, "\n");
		text = text.replace(/\n/g, "<br>");
		text = this.doEffects(text, opt.withoutEffects);
		text = _DoAutoLinks(text);

		return text;
	},
	doEditFormat: function(text) {
		$div = $("<div></div>").html(text);

		$div.find("a").each(function() {
			$(this).before(document.createTextNode($(this).text())).remove();
		});

		$div.html($div.html().replace(/<br>/g, "\n"))
		text = $div.text();
		text = text.replace(/\n/g, "<br>");

		return text;
	},
	doEffects: function(text, noCry) {
		var sound = [
			["\x61\x68\x61\x68 \x21", "./effects/\x61\x68\x61\x68"],
			["say_\x6f\x75\x69", "./effects/\x6f\x75\x69", "\x6f\x75\x69"],
			["say_\x6e\x6f\x6e", "./effects/\x6e\x6f\x6e", "\x6e\x6f\x6e"],
			["say_\x70\x72\x65\x74", "./effects/areyouready", "\xca\x74\x65\x73\x2d\x76\x6f\x75\x73\x20\x70\x72\xea\x74\x20\x3f"],
			["wtfa\x73\x68\x65\x65\x70", "./effects/\x73\x68\x65\x65\x70", "\x2a\x53\x6f\x75\x6e\x64\x20\x73\x68\x65\x65\x70\x2a"],
			[Page.chat.pseudo, "./effects/pseudo", "<b>" + Page.chat.pseudo + "</b>", 1]
		];

		if (!window.Audio) {
			window.Audio = function() {
				this.canPlayType = this.play = function() {};

				return this;
			};
		}
		var ext = ((new Audio()).canPlayType('audio/ogg;') === "maybe") ? ".ogg" : ".mp3",
			audio = new Audio("./effects/newmsg" + ext);

		audio.volume = Page.chat.volume;
		(!noCry && audio.play());

		var bool = false,
			effects = [];
		for (var s = 0; s < sound.length; s++) {
			if (0 <= text.search(sound[s][0])) {
				if (sound[s][2]) {
					text = text.split(sound[s][0]).join(sound[s][2]);
				}

				if (!bool && !noCry) {
					effects[s] = new Audio(sound[s][1] + ext);
					effects[s].volume = (sound[s][3]) ? sound[s][3] : Page.chat.volume;
					effects[s].play();
				}

				bool = true;
			}
		}

		return text;
	}
});

var _DoAutoLinks = (function() {
	var charInsideUrl = "[-A-Z0-9+&@#/%?=~_|[\\]()!:,.;]",
		charEndingUrl = "[-A-Z0-9+&@#/%=~_|[\\])]",
		autoLinkRegex = new RegExp("(=\"|<)?\\b(https?|ftp)(://" + charInsideUrl + "*" + charEndingUrl + ")(?=$|\\W)", "gi"),
		endCharRegex = new RegExp(charEndingUrl, "i");

	function handleTrailingParens(wholeMatch, lookbehind, protocol, link) {
		if (lookbehind)
			return wholeMatch;
		if (link.charAt(link.length - 1) !== ")")
			return "<" + protocol + link + ">";
		var parens = link.match(/[()]/g);
		var level = 0;
		for (var i = 0; i < parens.length; i++) {
			if (parens[i] === "(") {
				if (level <= 0)
					level = 1;
				else
					level++;
			} else {
				level--;
			}
		}
		var tail = "";
		if (level < 0) {
			var re = new RegExp("\\){1," + (-level) + "}$");
			link = link.replace(re, function(trailingParens) {
				tail = trailingParens;
				return "";
			});
		}
		if (tail) {
			var lastChar = link.charAt(link.length - 1);
			if (!endCharRegex.test(lastChar)) {
				tail = lastChar + tail;
				link = link.substr(0, link.length - 1);
			}
		}
		return "<" + protocol + link + ">" + tail;
	}

	function _DoAutoLinks(text) {
		text = text.replace(autoLinkRegex, handleTrailingParens);

		var replacer = function(wholematch, m1) {
			var url = encodeProblemUrlChars(m1);
			url = "redirect.php?=" + url;

			return "<a href=\"" + url + "\" target=\"_blank\">" + m1 + "</a>";
		};
		text = text.replace(/<((https?|ftp):[^'">\s]+)>/gi, replacer);

		return text;
	}

	var _problemUrlChars = /(?:["'*()[\]:]|~D)/g;

	function encodeProblemUrlChars(url) {
		if (!url)
			return "";

		var len = url.length;

		return url.replace(_problemUrlChars, function(match, offset) {
			if (match == "~D") // escape for dollar
				return "%24";
			if (match == ":") {
				if (offset == len - 1 || /[0-9\/]/.test(url.charAt(offset + 1)))
					return ":";
			}
			return "%" + match.charCodeAt(0).toString(16);
		});
	}

	function escapeCharacters(text, charsToEscape, afterBackslash) {
		var regexString = "([" + charsToEscape.replace(/([\[\]\\])/g, "\\$1") + "])";

		if (afterBackslash) {
			regexString = "\\\\" + regexString;
		}

		var regex = new RegExp(regexString, "g");
		text = text.replace(regex, escapeCharacters_callback);

		return text;
	}

	function escapeCharacters_callback(wholeMatch, m1) {
		var charCodeToEscape = m1.charCodeAt(0);
		return "~E" + charCodeToEscape + "E";
	}
	return _DoAutoLinks;
})();