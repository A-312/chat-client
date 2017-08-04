require.define("chat", {
	timeoutOpenGuestList: null,
	timeoutOpenGuestList_start: 0,
	_lastTABword: null,
	autoscroll: true,
	edition: false,
	pseudo: null,
	volume: 0.42,
	color: [],
	full: function() {
		if ($("#chat.normal")[0]) {
			$("#chat").removeClass("normal");
			$("#fullscreen a").text("FIXED SCREEN");
			$("body").css("overflow", "hidden");

			Page.overlay.makeTooltip("Mode : Fullscreen activé", 1000);
		} else {
			$("#chat").addClass("normal").css("width", "");
			$("#fullscreen a").text("FULLSCREEN");
			$("body").css("overflow", "");

			Page.overlay.makeTooltip("Mode : Fullscreen désactivé", 1000);
		}

		Page.chat.html.resizeListener();
	},
	load: function() {
		$("#messages_chat_mini").append($("#messages_chat > div").clone());

		$("#fullscreen").click(this.full);
		$("#chat").addClass("autoscroll");

		$("#input_chat.clickable").click(function() {
			Page.overlay.make({
				id: "overlog",
				children: [{
					label: "Pseudo",
					type: "text",
					id: "overlog_pseudo",
					val: localStorage.pseudo
				}, {
					label: "Mot de passe",
					type: "password",
					id: "overlog_pwd"
				}, {
					value: "Envoyer",
					type: "button",
					click: function() {
						var pseudo = $("#overlog_pseudo_input").val();

						var regex = /^([A-z0-9\-_]{3,12})$/;
						if (!regex.test(pseudo)) {
							return Page.overlay.makeTooltip("Le pseudo doit contenir uniquement : A-z, 0-9, -, _. Et faire entre 3 à 12 caractères.");
						}

						Page.socket.login({
							pseudo: pseudo,
							key: localStorage.sessionkey
						}, function(data) {
							if (data.type === "erreur") {
								$("#overlog_pseudo").css("border-color", "red");
								return Page.overlay.makeTooltip(data.msg);
							}

							Page.overlay.remove();
						});
					}
				}]
			});
			Page.overlay.hide("overlog_pwd");
		});

		this.html.addResizeListener();

		/* File : Drag'n'Drop */
		var stopPropagande = function(event) {
			event.stopPropagation();
			event.preventDefault();
		};

		window.__draglevel = 0;
		window.__dragstack = [];
		$(window).bind("dragenter", function(event) {
			//stopPropagande(event);
			var bool = false;
			try {
				bool = !event.originalEvent.dataTransfer.getData("text/plain");
			} catch (e) {}

			if (__draglevel == 0 || __dragstack.length == 0) {
				if (bool)
					$("#drag-overlay").show();
			}
			__draglevel++;
			if (__dragstack.indexOf(event.target) === -1)
				__dragstack.push(event.target);
		});

		$(window).bind("dragover", function(event) {
			stopPropagande(event);
		});

		$(window).bind("dragleave", function(event) {
			stopPropagande(event);
			__draglevel--;
			__dragstack.remove(event.target);
			if (__draglevel == 0 || __dragstack.length == 0) {
				$("#drag-overlay").hide();
			}
		});

		$(window).bind("drop", function(event) {
			var dataTransfer = event.originalEvent.dataTransfer;
			if (dataTransfer && dataTransfer.getData("text/plain")) {
				if ($(event.target).is("[contenteditable]")) {
					if (!dataTransfer.getData("text/html") || dataTransfer.getData("text/html").match(/\w{5}/))
						return true;

					var caret = $(event.target).caret(),
						start = (caret.word) ? caret.word : "";

					caret.replaceWord(start + dataTransfer.getData("text/plain") + " ");

					$("body").focus();
					$(event.target).focus();
				}
				__draglevel = 0;
				$("#drag-overlay").hide();
				return stopPropagande(event);
			}

			stopPropagande(event);
			$("#drag-overlay").hide();
			__draglevel = 0;
			var files = event.originalEvent.target.files || dataTransfer.files;

			for (var i = 0, file, img, reader, type; i < files.length; i++) {
				file = files[i];
				reader = new FileReader();
				type = (file.type.indexOf("image") === 0) ? "image" : "text";
				reader.onload = function(eFile) {
					if (file.type.indexOf("image") === 0) {
						img = new Image();
						img.onload = function() {
							Page.chat.openConfirmUpload({
								src: this.src,
								name: file.name
							});
						};
						img.src = eFile.target.result;
					} else {
						Page.chat.openConfirmUpload({
							text: eFile.target.result,
							name: file.name
						});
					}
				};
				reader[(type === "image") ? "readAsDataURL" : "readAsText"](file);

				return; // on ne gére que un seul fichier pour l'instant (c'est déjà bien ^_^)
			}
		});

		/* Prevent HTML */
		window.__activeDOMNodeInserted = false;
		window.__timeoutDOMNodeInserted = null;
		$("#inputHTML").bind("DOMNodeInserted", function(event) {
			var $inputHTML = $(this);
			if (!__activeDOMNodeInserted) {
				clearTimeout(__timeoutDOMNodeInserted);
				__timeoutDOMNodeInserted = setTimeout(function() {
					var caret = $inputHTML.caret(),
						length = $inputHTML.text().length;
					__activeDOMNodeInserted = true;

					var isBlock = function(el) {
						return (["block", "table-row"].indexOf($(el).css("display")) !== -1);
					};

					var html2Text = function(element) {
						if (element.nodeName === "IMG") {
							if (element.src && element.src.indexOf("data:") === 0) {
								var img = new Image();
								img.onload = function() {
									Page.chat.openConfirmUpload({
										src: this.src
									});
								};
								img.src = element.src;
								element.parentNode.removeChild(element);
							} else if (element.src) {
								var abc = (element.title && element.title.indexOf(" ") === -1) ? element.title : element.src;
								element.parentNode.replaceChild(document.createTextNode(abc), element);
							} else {
								element.parentNode.removeChild(element);
							}
						} else if (element.nodeName === "A") {
							if ($(element).text().indexOf("http") === 0) {
								element.parentNode.replaceChild(document.createTextNode($(element).attr("href")), element);
							} else {
								element.parentNode.replaceChild(document.createTextNode($(element).text() + " - " + $(element).attr("href")), element);
							}
						} else {
							return false;
						}
						return true;
					};

					var inputHTML = $("#inputHTML")[0],
						level = 0,
						element, abc;

					while (inputHTML.children.length > 0 && inputHTML.children[level]) {
						element = inputHTML.children[level];
						if (element.nodeName === "BR") {
							level++;
						} else {
							if (!html2Text(element)) {
								abc = (isBlock(element)) ? "\n" : " ";
								abc = (element.children.length === level + 1) ? "" : abc;
								if ($(element).children()[0]) {
									$(element).find("*").each(function() {
										if ($(this).children()[0] || !($(this).text() + "").replace(/\s/g, ""))
											return;

										if (html2Text(this))
											return;

										var escape = (isBlock($(this).parent()) && $(this).is(":last-child")) ? "\n" : " ";
										$(this).text($(this).text() + escape);
									});
								}
								element.parentNode.replaceChild(document.createTextNode($(element).text() + abc), element);
							}
						}
					}
					Page.chat.html.updateInput();
					$inputHTML.caret(caret.start + $inputHTML.text().length - length);

					__activeDOMNodeInserted = false;
				}, 1);
			}
		});

		$("#input_chat > div.pm > div.pseudo").dblclick(function() {
			Page.overlay.makeTooltip("Le menu sera disponible prochainement.");
		});

		$("#inputHTML").keypress(function(e) {
			var bool = true;

			if ($(this).prop('disabled')) {
				return false;
			} else if (!e.shiftKey && e.keyCode === 13) {
				$(this).prop('disabled', true); // Avant sendMessage.

				Page.socket.sendMessage(Page.parser.parseHTML2TEXT($(this).html()));

				bool = false;
			} else if (e.keyCode === 9) {
				return false;
			}

			//console.log(e.keyCode, e.charCode);

			return bool;
		}).keydown(function(e) {
			if (e.keyCode === 38 || e.keyCode === 40) {
				var caret = $(this).caret();

				$(this).data("caretStart", caret.start);

				if (caret.start === 0) {
					if (!Page.chat.inputSelectMsgToEdit.apply(this, arguments)) {
						$(this).data("caretStart", -1);
					}
				}
			}
		}).keyup(function(e) { // chrome support...
			var bool = true;

			if (e.keyCode === 38 || e.keyCode === 40) { // ↑ || ↓
				bool = Page.chat.inputSelectMsgToEdit.apply(this, arguments);
			} else if (e.keyCode === 27 && Page.chat.edition !== false) { // ESC
				$(this).removeClass("editing").text("");
				Page.chat.html.updateInput();
				Page.chat.edition = false;
				bool = false;
			}
			//console.log(e.keyCode, e.charCode);

			return bool;
		}).bind("input", function() {
			Page.chat.html.updateInput();

			if ($("#inputHTML").html() == "<br>") {
				$("#inputHTML").html("");
			}
		});

		$(window).keydown(function(e) {
			if (e.keyCode == 9) { // TAB
				if (Page.chat.timeoutOpenGuestList === null) {
					Page.chat.timeoutOpenGuestList_start = new Date();
					Page.chat.timeoutOpenGuestList = setTimeout(function() {
						Page.chat.openGuestList();
					}, 200);
				}

				return false;
			}
		}).keyup(function(e) {
			if (e.keyCode == 9) { // TAB
				if (Page.chat.timeoutOpenGuestList !== null) {
					clearTimeout(Page.chat.timeoutOpenGuestList);
					Page.chat.timeoutOpenGuestList = null; //x2

					if ($("#overcolist")[0]) {
						Page.overlay.remove();
					}
				} // HO + TAB
				if (new Date() - Page.chat.timeoutOpenGuestList_start <= 200) {
					var caret = $("#inputHTML").caret(),
						word = "" + caret.word,
						lastTAB = Page.chat._lastTABword,
						retry = false;

					if (word.length > 0 && caret.start <= (caret.wordStart + word.length)) {
						for (var i in Page.socket.clients) {
							if (!Page.socket.clients.hasOwnProperty(i)) continue;
							pseudo = Page.socket.clients[i].pseudo;

							if (pseudo.toLowerCase().indexOf(word.toLowerCase()) === 0) {
								if (pseudo !== word) {
									caret.replaceWord(pseudo);
									Page.chat._lastTABword = [word, caret.wordStart, pseudo];
									retry = false;
									break;
								} else if (lastTAB && lastTAB[1] === caret.wordStart && lastTAB[2] === pseudo) {
									word = lastTAB[0];
									retry = true;
								}
							}
						}
						if (retry)
							caret.replaceWord(word);
					}
				}

				return false;
			}
		});

		//scrollEvent
		$(window).bind("DOMMouseScroll mousewheel", function(event) {
			event = event.originalEvent;
			var delta = 0;
			if (event.wheelDelta) {
				delta = event.wheelDelta / 120;
			} else if (event.detail) {
				delta = -event.detail / 2;
			}

			if (delta) {
				Page.chat.html.moveScroll($("#messages_chat").scrollTop() - delta * 40);
			}
		});

		var func = Page.chat.html.scrollEvent;
		$("#focus_window").mousedown(func);
		$(window).mouseup(func).mousemove(func);

		//mobile
		$("#focus_window").bind("touchstart", func);
		$(window).bind("touchend touchmove", func);
		//Ajouter touchstart event pour les mobiles

		if (screen.height <= 600 || screen.width <= 600) {
			$("html").addClass("mobile");
			Page.chat.full();

			//chrome-mobile
			if (window.chrome && /Mobile/.test(navigator.userAgent)) {
				var m = (Page.getOrientation() === "portrait") ? "P" : "L";

				$("html")
					.addClass("ChromeMobile ChromeMobileAD-visible")
					.data("browser" + m + "H", $(window).height() + Page.chromeMobile_pixel);
			}
		}

		$(window).bind("orientationchange", function(event) {
			Page.overlay.makeTooltip(Page.getOrientation());
		});

		console.log("chat : ok");

		Page.overlay.make({
			id: "overwait",
			children: [{
				tag: "p",
				text: "En attente d'une connexion au serveur.",
				style: {
					"text-align": "center"
				}
			}],
			close: false
		});
	},
	inputSelectMsgToEdit: function(e) {
		var bool = true;
		var edition = (Page.chat.edition !== false),
			$msg_chat = $("#messages_chat"),
			$div = null,
			chang = false;
		if (!edition && e.keyCode === 38) {
			$div = $msg_chat.children("div.pm:data(author=" + Page.chat.pseudo + "):last");
			chang = ($(this).text() === "");
		} else if (edition) {
			$div = $msg_chat.children("div.pm:data(hex=" + Page.chat.edition + ")");
			var caretAtFirst = $(this).data("caretStart"),
				caretStart = $(this).caret().start;

			if ($(this).text() === $div.children("div.text").text() && caretAtFirst !== -1 && (caretAtFirst === caretStart || caretStart === 0)) {
				$div = $div[(e.keyCode === 38) ? "prevAll" : "nextAll"]("div.pm:data(author=" + Page.chat.pseudo + ")").first();

				if (!$div[0] && e.keyCode === 40) {
					$(this).removeClass("editing").text("");
					Page.chat.html.updateInput();
					Page.chat.edition = false;
					bool = false;
				} else {
					chang = true;
				}
			}
		}

		if (chang && $div[0] && 240000 > (new Date() - $div.data("time"))) {
			Page.chat.edition = $div.data("hex");

			$(this).addClass("editing").html(Page.parser.doEditFormat($div.children("div.text").html()));
			Page.chat.html.updateInput();

			var range = document.createRange();
			range.selectNodeContents($(this)[0]);
			range.collapse(false);
			var selection = window.getSelection();
			selection.removeAllRanges();
			selection.addRange(range);

			bool = false;
		}
		return bool;
	},
	openConfirmUpload: function(opt) {
		var preview = null,
			clickevent = null;
		if (opt.src) {
			preview = {
				src: opt.src,
				class: "preview"
			};
			clickevent = function() {
				Page.uploadImgur({
					data: {
						image: opt.src.replace(/data:[\w\/]+;base64,/, ""),
						type: "base64",
						title: Page.chat.pseudo + "'s image",
						description: "Uploaded by " + Page.chat.pseudo + " in chat.12z.fr",
						name: opt.name
					},
					success: function(data) {
						var url = "http://imgur.com/" + data.data.id;
						if (opt.success) {
							opt.success(url);
						} else {
							var caret = $("#inputHTML").caret(),
								start = (caret.word) ? caret.word : "";

							caret.replaceWord(start + " " + url);
						}

						Page.chat.html.updateInput();
					}
				});

				Page.overlay.remove();
			};
		} else {
			preview = {
				textarea: opt.text,
				class: "preview"
			};
			clickevent = function() {
				var files = {};
				files[opt.name] = {
					content: opt.text
				}
				Page.uploadGist({
					data: {
						description: "Uploaded by " + Page.chat.pseudo + " in chat.12z.fr",
						files: files
					},
					success: function(data) {
						var url = data["html_url"];
						if (opt.success) {
							opt.success(url);
						} else {
							var caret = $("#inputHTML").caret(),
								start = (caret.word) ? caret.word : "";

							caret.replaceWord(start + " " + url);
						}

						Page.chat.html.updateInput();
					}
				});

				Page.overlay.remove();
			};
		}
		Page.overlay.make({
			id: "overupconfirm",
			children: [{
					tag: "p",
					html: "Êtes-vous sur de vouloir uploader le fichier ?\n",
					style: {
						"text-align": "center"
					},
				},
				preview, {
					value: "Envoyer",
					type: "button",
					click: clickevent
				}, {
					link: "Annuler",
					click: function() {
						Page.overlay.remove();
					}
				}
			],
			close: false
		});
		$("#overupconfirm input[type=button]").focus();
	},
	openGuestList: function() {
		var msgLog = "",
			pseudo;
		for (var i in Page.socket.clients) {
			if (!Page.socket.clients.hasOwnProperty(i)) continue;
			pseudo = Page.socket.clients[i].pseudo;
			msgLog += "<div class=\"trois\">" + pseudo + "</div>";
		}
		Page.overlay.make({
			id: "overcolist",
			children: [{
				tag: "p",
				html: "Liste des connectés :\n" + msgLog,
				style: {
					"text-align": "center"
				}
			}],
			close: true,
			onclose: function() {
				clearTimeout(Page.chat.timeoutOpenGuestList);
				Page.chat.timeoutOpenGuestList = null; //x2
			}
		});
	},
	activate: function() {
		$("#inputHTML").prop("contenteditable", true).text("")
			.prop("disabled", false)
			.closest("#input_chat")
			.removeClass("disabled clickable");
		Page.chat.html.updateInput();
	},
	desactivate: function() {
		$("#inputHTML").prop("contenteditable", false)
			.prop("disabled", true)
			.closest("#input_chat")
			.addClass("disabled clickable");
	},
	clear: function() {
		$(".listemessages > div").remove();
		$(this).removeClass("editing").text("");
		Page.chat.html.updateInput();
		Page.chat.edition = false;
	},
	editMessage: function(data) {
		var $div = $("div.pm:data(hex=" + data.edit + ")");
		if ($div[0]) {
			var $text = $div.children("div.text");
			$text.html(Page.parser.parseTEXT2HTML(data.text));

			if (!$div.children("font").find("a.e")[0]) {
				$("<a></a>").addClass("e").prependTo($div.children("font"));
			}
		}
	},
	removeMessage: function(aParam) {
		var uniq = (typeof aParam === "string") ? aParam : aParam.data("uniq");
		$("div.pm:data(uniq=" + uniq + ")").remove();
	},
	addMessage: function(data, opt) {
		var pseudo = (data.pseudo) ? data.pseudo : "NaN",
			text = (data.text) ? data.text : "NaN",
			$text = null,
			normal = !!data.pseudo,
			statusbar = false;

		opt = (opt) ? opt : {};

		var $div = $("<div class=pm></div>");

		if (!normal) {
			if (data.typeClass) {
				$div.addClass(data.typeClass);
				if (data.typeClass === "prev") {
					$div.addClass("nobody");
					$div.click(function() {
						Page.socket.getPrevMessage(data.currentIndex, $div);
					});
				} else if (data.typeClass == "statusbar") {
					$div.addClass("info");
					pseudo = "Liste des connectés ";
					var $text = $("<div class=text></div>"),
						clients = data.args[0],
						$a, color;

					for (var i in clients) {
						if (!clients.hasOwnProperty(i)) continue;
						color = Page.chat.getPseudoColor(clients[i], true);
						color = (color) ? "bg-" + color : "unknow";
						$a = $("<a class=\"" + color + "\">" + clients[i] + "</a>").data("pseudo", clients[i]);
						$text.append($a);
					}

					opt.insertBefore = $("div.pm:data(uniq=" + data.args[1] + ")");
				}
			}
		} else if (pseudo === "Information") {
			$div.addClass("info");

			var reg = /list: ?\[(.*?)\] /, //<=== clientslist
				b2 = text.split("@meta:"),
				match = (b2 && b2[1]) ? reg.exec(b2[1]) : null;

			if (match) {
				$div.addClass("meta-clientslist");
				statusbar = match[1].split(",");
			}
			if (!$("html").hasClass("debug") && b2[1]) text = b2[0]
		} else {
			$div.addClass(Page.chat.getPseudoColor(pseudo));
		}

		var hex = (data.hex) ? data.hex : "spec",
			time = (data.time) ? data.time : +new Date(),
			uniq = hex + "-" + $("div.pm").length + "-" + time.toString(32) + "-" + new Date().toLocaleTimeString();

		if (data.hex) {
			$div.data("hex", hex);
			$div.data("time", time);
			$div.data("author", pseudo);
		}

		$div.data("uniq", uniq);

		if (!Page.focus && !$div.hasClass("info")) {
			Page.notifCount++;
			if (Page.notifCount === 1) {
				var f = function() {
					if (document.title === Page.title && Page.notifCount !== 0) {
						document.title = "(" + Page.notifCount + ") " + Page.title;
					} else {
						document.title = Page.title;
					}

					if (Page.notifCount !== 0) {
						setTimeout(f, 1200);
					}
				};
				f();
			}
		}

		$("<div class=pseudo></div>").text(pseudo).appendTo($div);

		if ($text) {
			$text.appendTo($div);
		} else {
			$("<div class=text></div>").html(Page.parser.parseTEXT2HTML(text, {
				withoutEffects: !!opt.withoutEffects
			})).appendTo($div);
			//Page.parser.setEvent($div.children("span"));
		}

		if (normal) {
			var $font = $("<font></font>").appendTo($div),
				$date = $("<a></a>").addClass("d").text((new Date(data.time)).toTimeString().split(" ")[0]).appendTo($font),
				$datelast = $("#messages_chat > div.pm > font > a.d.now");

			if (!$datelast[0] || opt.now || Math.abs(new Date(data.time) - $datelast[(opt.first) ? "first" : "last"]().closest("p").data("time")) >= 300000) {
				$date.addClass("now");
			}

			if (data.edition) {
				$("<a></a>").addClass("e").prependTo($font);
			}

			if (data.nolog) {
				$("<a></a>").text("hidden").prependTo($font);
			}
		}

		if (opt.first) {
			$div.prependTo(".listemessages");
		} else if (opt.insertBefore) {
			$div.insertBefore(opt.insertBefore);
		} else {
			$div.appendTo(".listemessages");
		}

		if (statusbar) {
			if (!$div.next().hasClass("statusbar") && $div.prev().prev().hasClass("statusbar")) {
				Page.chat.removeMessage($div.prev().prev());
			}
			if (!$div.next().hasClass("statusbar") && !$div.next().hasClass("info meta-clientslist")) {
				Page.chat.addMessage({
					typeClass: "statusbar",
					args: [statusbar, uniq]
				});
			}
		}

		if ($("#chat").hasClass("autoscroll")) {
			Page.chat.html.moveScroll(Page.chat.getMessagesHeight() - $("#focus_window").height());
		}

		//if (statusbar)
		//Page.chat.removeMessage(uniq);

		//this.doNoMini();
	},
	getMessagesHeight: function() {
		var swit = !$("#minimap").is(":visible"), // support quand la minimap n'est pas visible
			h = 0;

		(swit && $("#minimap").toggle());
		height = $("#messages_chat_mini").height();
		(swit && $("#minimap").toggle());

		return height;
	},
	getPseudoColor: function(pseudo, nomk) {
		var color = Page.chat.color;
		if (color.indexOf(pseudo) === -1) {
			if (nomk) return null;
			color.push(pseudo);

			$("div.statusbar > div.text > a:data(pseudo=" + pseudo + ")").removeClass("unknow").addClass("bg-c" + color.indexOf(pseudo));
		}
		return "c" + color.indexOf(pseudo);
	},
	antiflood_interval: null,
	antiflood: function(sec) {
		this.desactivate();
		$("#inputHTML").data("sec", sec);

		clearInterval(Page.chat.antiflood_interval);
		var f = function() {
			var $inputHTML = $("#inputHTML"),
				sec = parseInt($inputHTML.data("sec"));

			$inputHTML.text("Vous devez attendre " + sec + " secondes pour envoyer à nouveau des messages.");
			$inputHTML.data("sec", sec - 1);

			if (sec <= 0) {
				Page.chat.activate();
				clearInterval(Page.chat.antiflood_interval);
			}
		};
		this.antiflood_interval = setInterval(f, 1000);
		f();
	},
	html: {
		scrollEvent: function(event) {
			var $focus = $("#focus_window"),
				maxTop = 0,
				mouseTop = 0,
				scrollTop = 0;

			if (event && !event.clientY && event.originalEvent.touches && event.originalEvent.touches[0]) {
				event.clientY = event.originalEvent.touches[0].clientY;
			}

			if (event.type == "mousedown" || event.type == "touchstart") {
				$focus.data("active", true);
				$("body").addClass("noselect");
				mouseTop = (event.clientY + $(window).scrollTop() - $("#chat_mini").position().top - mouseTop) - $focus.position().top;
				$focus.data("top", mouseTop);

				return false;
			} else if ((event.type == "mouseup" || event.type == "touchend") && $focus.data("active") == true) {
				$focus.data("active", false);
				$("body").removeClass("noselect");

				Page.chat.html.scrolling();
				//return false; laisse comme ça petite tête !
			} else if ((event.type == "mousemove" || event.type == "touchmove") && $focus.data("active") == true) {
				mouseTop = parseInt($focus.data("top"));
				scrollTop = (event.clientY + $(window).scrollTop() - $("#chat_mini").position().top - mouseTop) / 0.15;

				Page.chat.html.moveScroll(scrollTop);

				return false;
			}
		},
		scrolling: function() {
			var $divlast = $("#messages_chat > div.pm:last"),
				bottom = $("#messages_chat").height() - (($divlast[0]) ? $divlast.position().top : 0),
				autoscroll = !!(0 <= bottom && bottom <= $divlast.outerHeight(true));

			if (!$divlast[0] || $("#messages_chat").scrollTop() === 0)
				return;

			if ($("#chat").hasClass("autoscroll") !== autoscroll) {
				Page.overlay.makeTooltip("Autoscroll : " + ((autoscroll) ? "" : "dés") + "activé", 1000);
			}

			$("#chat")[((autoscroll) ? "add" : "remove") + "Class"]("autoscroll");
		},
		moveScroll: function(scrollTop) {
			var messagesHeight = Page.chat.getMessagesHeight(); //$("#messages_chat_mini").height()

			if (typeof scrollTop !== "undefined") {
				var maxTop = messagesHeight - $("#focus_window").height();
				scrollTop = (scrollTop < maxTop) ? scrollTop : maxTop;
				scrollTop = (0 < scrollTop) ? scrollTop : 0;

				$("#messages_chat").scrollTop(scrollTop);
				$("#focus_window").css("top", scrollTop);
			}

			if ($("#minimap").height() < messagesHeight * 0.15) {
				var ecart = $("#minimap").height() - messagesHeight * 0.15;
				$("#chat_mini").css("top", ecart * $("#focus_window").position().top / (messagesHeight * 0.15 - $("#focus_window").height() * 0.15));
			}

			Page.chat.html.scrolling();
		},
		addResizeListener: function() {
			var $sheet = $("<style id=dynamic></style>").prependTo("#chat");
			var rules = "/* Dynamo, dynamic, ... Hors-Sujet ! :B */ ";

			rules += "div.chatdisplay > div.pm > div.text { } ";
			rules += "div.tooltipInfo { } ";

			$sheet.text(rules);

			var f = this.resizeListener;
			$(window).resize(f);
			f();
		},
		setTooltipInfoPos: function() {
			var sheet = $("style#dynamic")[0].sheet,
				rules = "cssRules" in sheet ? sheet.cssRules : sheet.rules,
				$overform = $(".overlay > div.form"),
				a = 0;

			if ($overform[0]) { // Décale les messages vers le bas
				a = $overform.position().top + $overform.outerHeight(true) - $("#chat").height() * 0.42;
			}

			rules[1].style.bottom = ($("#chat").height() * 0.42 - a / 2) + "px";
		},
		updateInput: function() {
			var $chat = $("#chat"),
				$msgchat = $("#messages_chat"),
				$focus_window = $("#focus_window"),
				$inputHTML = $("#inputHTML"),
				height = $chat.height();

			if (!$chat.hasClass("normal")) {
				var m = (Page.getOrientation() === "portrait") ? "P" : "L";

				height = ($("html").data("browser" + m + "H")) ? $("html").data("browser" + m + "H") : $(window).height();
				height -= $chat.offset().top + ($chat.outerHeight(true) - $chat.height());
			}

			$msgchat.height(height - $("#input_chat").height() - ($msgchat.outerHeight(true) - $msgchat.height()));
			$focus_window.height($msgchat.height());
			$inputHTML.parent().find("font > a.n").text(Page.parser.parseHTML2TEXT($inputHTML.html()).length + " / 365");

			Page.chat.html.moveScroll();
		},
		resizeListener: function() {
			var $chat = $("#chat"),
				$msgchat = $("#messages_chat"),
				$listmsgs = $("div.listemessages"), //x2 mini et normal
				$focus_window = $("#focus_window"),
				$minimap = $("#minimap"),
				isNormal = !!$chat.hasClass("normal"),
				freesize = 0,
				padding = 0,
				sheet = $("style#dynamic")[0].sheet,
				rules = "cssRules" in sheet ? sheet.cssRules : sheet.rules;

			var m = (Page.getOrientation() === "portrait") ? "P" : "L";
			if ($("html").hasClass("ChromeMobile")) {
				if (!$("html").data("browser" + m + "H")) {
					$("html").data("browser" + m + "H", $(window).height() + (($("html").hasClass("ChromeMobileAD-visible")) ? Page.chromeMobile_pixel : 0));
					console.log("set browser" + m + "H");
				} else {
					console.log("get browser" + m + "H", $("html").data("browser" + m + "H"), $(window).height() - (($("html").hasClass("ChromeMobileAD-visible")) ? Page.chromeMobile_pixel : 0) - 20);
				}

				var bOrientation = $("html").data("browserOrientation");
				if (bOrientation && bOrientation !== Page.getOrientation()) {
					if ($("#chat").hasClass("autoscroll")) {
						Page.chat.html.moveScroll(Page.chat.getMessagesHeight() - $("#focus_window").height());
					}
				} else if ($("html").hasClass("ChromeMobileAD-visible") && $("html").data("browser" + m + "H") <= $(window).height()) {
					if ($("html").hasClass("debug"))
						Page.overlay.makeTooltip("hidden");

					$("html")
						.removeClass("ChromeMobileAD-visible")
						.addClass("ChromeMobileAD-hidden");
				} else if ($("html").hasClass("ChromeMobileAD-hidden")) {
					if ($("html").hasClass("debug"))
						Page.overlay.makeTooltip("visible");

					$("html")
						.addClass("ChromeMobileAD-visible")
						.removeClass("ChromeMobileAD-hidden");
				}
				console.log("use browser" + m + "H", $("html").data("browser" + m + "H"));
				$("html").data("browserOrientation", Page.getOrientation());
			}

			for (var i = 0; i <= 1; i++) {
				if ($(window).width() >= 500) {
					$minimap.show().width(Math.min(150, $listmsgs.width() * 0.15));
				} else {
					$minimap.hide().width("0px");
				}
				padding = $minimap.outerWidth(true) + 9;
				$chat.css("padding-right", padding);

				if (!isNormal || $(window).width() <= 762) {
					padding -= ($("#minimap").is(":visible")) ? -5 : -1;
					$chat.width($(window).width() - padding);
				} else {
					$chat.css("width", "");
				}

				$listmsgs.width($chat.width());
				$("#chat_mini").css("transform", "scale(0.15)");

				padding = $msgchat.outerHeight(true) - $msgchat.height();
				freesize = (isNormal) ? $chat.height() : ($(window).height() - $chat.offset().top - ($chat.outerHeight(true) - $chat.height()));

				//width (La largeur avant la hauteur :B)
				rules[0].style.width = ($msgchat.width() - 120) + "px"; // (110 pseudo + padding 10)
				//	          .setProperty("width", my_width, "important");
				d = new Date();

				//height
				$minimap.height($chat.height());
				Page.chat.html.setTooltipInfoPos();
				Page.chat.html.updateInput();
			}
		}
	}
});