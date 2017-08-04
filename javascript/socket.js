require.define("socket", {
	websocket: null,
	intervalCheckServer: null,
	clients: [],
	load: function() {
		var websocket = io.connect(getMetaContentByTagName("server.ip") + "/chat");

		this.websocket = websocket;

		this.listener(websocket);

		console.log("chat socket : ok");
	},
	listener: function(websocket) {
		websocket.on("connect", function() {
			if ($("div#overwait")[0]) {
				Page.overlay.remove();
			}

			Page.chat.clear();

			if (localStorage.pseudo && !$("input#overlog_pseudo_input")[0]) {
				Page.socket.login({
					pseudo: localStorage.pseudo,
					key: localStorage.sessionkey
				}, function(data) {
					if (data.type === "erreur") {
						return Page.overlay.makeTooltip("Connexion auto (" + localStorage.pseudo + ") : " + data.msg, 2000);
					}
				});
			}

			Page.socket.intervalCheckServer = setInterval(function() {
				if (!Page.socket.websocket.connected) {
					return Page.socket.deconnection();
				}
			}, 1000);
		});

		websocket.on("message", function(data) {
			if (!data.edit) {
				Page.chat.addMessage(data);
			} else {
				Page.chat.editMessage(data);
			}
		});

		websocket.on("ping", function(data) {
			if (data && data.timestamp) {
				websocket.emit("pong", {
					timestamp: data.timestamp
				});
			}
		});

		websocket.on("refuse", function(data) {
			console.log("refuse");
			var t = [];
			t.push({
				tag: "p",
				html: "<u>Connexion refusé :</u> " + data.refuse,
				style: {
					"text-align": "center",
					"margin-bottom": "10px"
				}
			});

			if (data.type === "already_connected") {
				t = [t[0], {
					label: "Salon",
					type: "text",
					id: "overrefuse_salon"
				}, {
					value: "Envoyer",
					type: "button",
					click: function() {
						Page.overlay.makeTooltip("D'autres salons seront disponibles prochainement.");
					}
				}];
			}

			Page.overlay.make({
				id: "overrefuse",
				children: t,
				close: false
			});
		});

		websocket.on("disconnect", function(data) {
			var err = "Vous avez été déconnecté.";
			if (Page.socket.servercrash) {
				err = "Le serveur a CRASH...";
				delete Page.socket.servercrash;
			}
			Page.overlay.makeTooltip(err, 4000);
			Page.overlay.make({
				id: "overwait",
				children: [{
					tag: "p",
					text: err,
					style: {
						"text-align": "center"
					}
				}],
				close: false
			});
		});

		websocket.on("client", function(data) {
			if (data.type === "all") {
				for (var i = 0, x; i < data.clients.length; i++) {
					x = data.clients[i];
					if (x) {
						Page.socket.clients[x.idClient] = x;
					}
				}
			} else if (data.type === "add") {
				Page.socket.clients[data.client.idClient] = data.client;
			} else if (data.type === "del") {
				delete Page.socket.clients[data.client.idClient];
			}
		});

		websocket.on("info", function(data) {
			Page.overlay.makeTooltip(data.msg, data.wait);
		});

		websocket.on("reload", function() {
			document.location.reload(true);
		});

		websocket.on("crash", function() {
			Page.socket.servercrash = true;
			Page.socket.waitme = true;
		});

		websocket.on("waitme", function() {
			Page.socket.waitme = true;
		});

		websocket.on("error", function() {
			Page.overlay.makeTooltip("Problème de connexion.", 4000);
			if (!Page.socket.waitme) {
				Page.socket.deconnection();
			} else {
				delete Page.socket.waitme;
			}
		});

		websocket.on("byebye", function() {
			Page.overlay.makeTooltip("La connexion au chat a été coupé.", 20000);
			Page.overlay.make({
				id: "overdeco",
				children: [{
					tag: "p",
					text: "La connexion au chat a été coupé.",
					style: {
						"text-align": "center"
					}
				}],
				close: false
			});
			Page.socket.deconnection();
		});
	},
	deconnection: function() {
		clearInterval(this.intervalCheckServer);
		this.websocket.disconnect();
		this.websocket.close();
	},
	login: function(args, callback) {
		this.websocket.emit("login", {
			pseudo: args.pseudo,
			key: args.key
		}, function(data) {
			if (data.type === "erreur") {
				return (callback && callback(data));
			}

			Page.overlay.makeTooltip("Tu es connecté avec le pseudo : " + data.pseudo);

			Page.chat.activate();
			Page.chat.color = [data.pseudo];
			Page.chat.pseudo = data.pseudo;
			localStorage.pseudo = data.pseudo;
			localStorage.sessionkey = data.key;
			document.cookie = "pseudo=" + data.pseudo + "; domain=.12z.fr; path=/";
			document.cookie = "sessionkey=" + data.key + "; domain=.12z.fr; path=/";

			Page.socket.printPrevLink(data.currentIndex);

			$("div#input_chat > div.pm > div.pseudo").text(data.pseudo);
			$("div#input_chat").unbind("click");

			(callback && callback(data));
		});
	},
	printPrevLink: function(currentIndex) {
		if (currentIndex > 0) {
			var s = (currentIndex !== 1) ? "s" : "";
			Page.chat.addMessage({
				text: "Afficher le" + (s ? "s " + Math.min(20, currentIndex) + " précédents" : " premier") + " message" + s + ".",
				typeClass: "prev",
				currentIndex: currentIndex
			}, {
				first: true
			});
		}
	},
	getPrevMessage: function(currentIndex, $div) {
		this.websocket.emit("getPrevMessage", {
			currentIndex: currentIndex
		}, function(data) {
			Page.chat.removeMessage($div);
			if (data) {
				for (var x in data.messages) {
					if (!data.messages.hasOwnProperty(x)) continue;
					Page.chat.addMessage(data.messages[x], {
						first: true,
						withoutEffects: true,
						now: (parseInt(/^#(.*)$/.exec(data.messages[x].hex)[1], 16) === data.last)
					});
				}

				Page.socket.printPrevLink(data.last);
			}
		});
	},
	sendMessage: function(text) {
		var $inputHTML = $("#inputHTML");

		var regex = /^([\W\w]{1,365})$/;
		if (text && regex.test(text)) {
			this.websocket.emit("message", {
				text: text,
				edit: Page.chat.edition
			}, function(data) {
				if (data.edit || (data.antiflood && Page.chat.edition)) {
					$inputHTML.removeClass("editing").text("");
					Page.chat.html.updateInput();
					Page.chat.edition = false;
				}

				if (data.type === "erreur") {
					Page.overlay.makeTooltip(data.msg);
					if (data.antiflood) {
						Page.chat.antiflood(data.antiflood);
					}
				} else if (data.type === "ok") {
					$inputHTML.text("");
					Page.chat.html.updateInput();
				} else {
					$inputHTML.text("");
					Page.chat.html.updateInput();

					if (!data.edit) {
						Page.chat.addMessage(data);
					} else {
						Page.chat.editMessage(data);
					}
				}

				$inputHTML.prop('disabled', false);
			});
		} else {
			if (2 < text.length) {
				Page.overlay.makeTooltip("Message trop long.");
				if (400 <= text.length) {
					Page.chat.openConfirmUpload({
						text: text,
						name: (text.indexOf("// ==UserScript==") === 0) ? "paste.user.js" : "paste.txt",
						success: function(url) {
							var quote = text.replace(/\n/g, "");
							$inputHTML.html("“" + quote.substr(0, 16) + "..." + quote.substr(-16) + "” (" + url + ")");
						}
					});
				}
			}

			$inputHTML.prop('disabled', false);
		}
	}
});