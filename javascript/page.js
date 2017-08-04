var Page = {
	overlay: null,
	socket: null,
	chat: null,
	parser: null,
	title: null,
	notifCount: 0,
	focus: true,
	chromeMobile_pixel: 56,
	getOrientation: function() {
		return (screen.height > screen.width) ? "portrait" : "landscape";
	},
	debug: function() {
		$("html").addClass("debug");
	},
	load: function(objects) {
		this.overlay = objects.overlay;
		this.socket = objects.socket;
		this.parser = objects.parser;
		this.chat = objects.chat;

		if (window.__debug)
			Page.debug();

		this.chat.load();
		this.socket.load();

		this.title = document.title;

		window.onerror = window.unload = function() {
			Page.socket.deconnection();
			Page.socket.websocket = null;
		};

		$(window).bind("blur focus", function(event) {
			Page.focus = (event.type === "focus") ? true : false;
			if (Page.focus)
				Page.notifCount = 0;
		});

		console.log("page : ok");

		objects.jQueryCaret(jQuery);
		$.extend($.expr[":"], {
			data: $.expr.createPseudo(function(dataName, dataValue) {
				var t = dataName.split("=");
				dataName = t[0], dataValue = t[1].replace(/["']/g, "");
				return function(elem) {
					var a = $.data(elem, dataName);
					return (a && (!dataValue || a === dataValue)) ? true : false;
				};
			})
		});

		console.log("jquery plugins : ok");
	},
	uploadImgur: function(opt) {
		var data = opt.data;
		if (data && data.type === "base64" && data.image) {
			data.image = data.image.replace(/^data:[\w\/]+;base64,/, "");
		}
		var imgurClientID = alert("imgurClientID");
		$.ajax({
			url: "https://api.imgur.com/3/image",
			xhr: function() {
				var xhr = $.ajaxSettings.xhr();
				xhr.upload.onprogress = function(e) {
					if (!e.lengthComputable)
						return;
					else if (e.loaded === e.total)
						return Page.overlay.makeTooltip("Upload terminé.", 1000, "overUploadTooltip");

					var max = 32,
						percent = Math.round(e.loaded / e.total * max),
						bar = Array(percent + 1).join("=") + Array(max - percent + 1).join("-"),
						text = "[" + bar + "] " + Math.round(e.loaded / e.total * 100) + " %";

					Page.overlay.makeTooltip(text, 1000, "overUploadTooltip");
				};
				console.log("ok");
				return xhr;
			},
			beforeSend: function(jqXHR) {
				jqXHR.setRequestHeader("Authorization", "Client-ID " + imgurClientID);
			},
			method: "POST",
			data: data,
			dataType: "json",
			success: opt.success
		});
	},
	uploadGist: function(opt) {
		var data = opt.data;
		if (data && data.type === "base64" && data.image) {
			data.image = data.image.replace(/^data:[\w\/]+;base64,/, "");
		}
		data["public"] = false;
		$.ajax({
			url: "https://api.github.com/gists",
			method: "POST",
			data: JSON.stringify(data),
			dataType: "json",
			success: opt.success
		});
	},
	getCookie: function(cname) {
		var name = cname + "=";
		var ca = document.cookie.split(';');
		for (var i = 0; i < ca.length; i++) {
			var c = ca[i];
			while (c.charAt(0) == ' ') c = c.substring(1);
			if (c.indexOf(name) != -1) return c.substring(name.length, c.length);
		}
		return "";
	}
};

String.prototype.splice = function(idx, rem, s) {
	return (this.slice(0, idx) + s + this.slice(idx + Math.abs(rem)));
};

Array.prototype.remove = function() {
	var what, a = arguments,
		L = a.length,
		ax;
	while (L && this.length) {
		what = a[--L];
		while ((ax = this.indexOf(what)) !== -1) {
			this.splice(ax, 1);
		}
	}
	return this;
};