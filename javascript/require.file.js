var require = {
	nbrfile_max: 0,
	nbrfile_load: 0,
	objects: {},
	success: function() {},
	define: function(name, object) {
		require.objects[name] = object;
	},
	load: function(opt, callback, baseURL, prefix) {
		var func = function(e) {
			require.nbrfile_load++;

			if (require.nbrfile_max == require.nbrfile_load) {
				require.success(require.objects);
			}
		};
		var funcErr = function(e) {
			var url = this.src;
			this.parentNode.removeChild(this);
			setTimeout(function() {
				var script = require.addScript(url);
				script.onload = func;
				script.onerror = funcErr;

				(opt.error && opt.error(e));
			}, 2000);
		}
		prefix = prefix || "";
		baseURL = baseURL || "";

		if (opt.js) {
			var url, script;
			for (var x in opt.js) {
				if (typeof(js_is_minify) == "undefined" || js_is_minify.indexOf(opt.js[x]) == -1) {
					//require.addScript((opt.js[x]=='javascript/lib/jquery-ui.js')?opt.js[x]:opt.js[x]+prefix).onload = func;

					url = ((opt.js[x].indexOf("://") !== -1) ? "" : baseURL) + opt.js[x] + prefix;
					console.log(url);
					script = require.addScript(url);
					script.onload = func;
					script.onerror = funcErr;

					require.nbrfile_max++;
				}
			}
		}
		if (opt.css) {
			for (var x in opt.css) {
				require.addCSS(baseURL + opt.css[x] + prefix).onload = func;

				require.nbrfile_max++;
			}
		}
		require.success = callback;
	},
	addScript: function(url) {
		var script = document.createElement("script");
		script.type = "text/javascript";
		script.src = url;
		script.charset = 'utf-8';
		script.async = false;

		document.getElementsByTagName("head")[0].appendChild(script);

		return script;
	},
	addCSS: function(url) {
		var css = document.createElement("link");
		css.type = "text/css";
		css.href = url;
		css.rel = "stylesheet";

		document.getElementsByTagName("head")[0].appendChild(css);

		return css;
	}
};

window.addEventListener("load", function() {
	window.__loaded = true;
}, false);

require.load({
	js: [
		"lib/jquery.min.js",
		"lib/socket.io.js",
		"jquery.caret.js",
		"parser.js",
		"chat.js",
		"socket.js",
		"overlay.js",
		"page.js"
	],
	css: [],
	error: function(e) {
		if (e.target.src.indexOf("socket.io") !== -1 && require.objects.overlay && !$("#overnojs")[0]) {
			var err = "Le serveur semble indisponible.";
			require.objects.overlay.makeTooltip(err, 4000);
			require.objects.overlay.make({
				id: "overnojs",
				children: [{
					tag: "p",
					text: err,
					style: {
						"text-align": "center"
					}
				}],
				close: false
			});
		}
	}
}, function(objects) {
	if ($("#overnojs")[0])
		require.objects.overlay.remove();

	if (window.__loaded) {
		Page.load(objects);
	} else {
		$(window).load(function() {
			Page.load(objects);
		});
	}
}, getMetaContentByTagName("requirejs.dir"), "?debug=" + (new Date()).getTime());

function getMetaContentByTagName(c) {
	for (var b = document.getElementsByTagName("meta"), a = 0; a < b.length; a++) {
		if (c == b[a].name || c == b[a].getAttribute("property")) {
			return b[a].content;
		}
	}
	return false;
}