require.define("overlay", {
	$overlay: null,
	$form: null,
	make: function(opt) {
		var $overlay = $('<div class="overlay"></div>').appendTo($("div#chat"));

		if (opt.close !== false) {
			$overlay.click(function(event) {
				if (event.target === $overlay[0]) {
					$(this).remove();
					(typeof opt.onclose === "function" && opt.onclose.call(this, event));
				}
			})
		}
		var $form = $('<div class="form"></div>').appendTo($overlay);

		if (opt.id) {
			$form.attr("id", opt.id);
		}

		this.$overlay = $overlay;
		this.$form = $form;

		var height = 0;
		for (var i = 0, $a = null, f = false; i < opt.children.length; i++) {
			if (opt.children[i].type === "button") {
				$a = this.addButton(opt.children[i]);
			} else if (opt.children[i].src) {
				$a = this.addImg(opt.children[i]);
			} else if (opt.children[i].link) {
				$a = this.addLink(opt.children[i]);
			} else if (opt.children[i].textarea) {
				$a = this.addTextarea(opt.children[i]);
			} else if ((opt.children[i].text || opt.children[i].html) && opt.children[i].tag) {
				$a = this.addText(opt.children[i]);
			} else {
				$a = this.addInput(opt.children[i]);
			}
			$form.append($a);
			if (!f) {
				$a.find("input").focus();
				f = true;
			}
			height += $a.outerHeight(true);
		}
		$form.height(height);

		if (Page.chat)
			Page.chat.html.setTooltipInfoPos();
	},
	hide: function(id) {
		var $form = this.$form,
			$el = $("#" + id);
		$el.hide();
		$form.height($form.height() - $el.outerHeight(true));
	},
	show: function(id) {
		var $form = this.$form,
			$el = $("#" + id);
		$el.show();
		$form.height($form.height() - $el.outerHeight(true));
	},
	remove: function() {
		(Page.overlay || this).$overlay.remove();

		if (Page.chat)
			Page.chat.html.setTooltipInfoPos();
	},
	addInput: function(opt) {
		var $div = $("<div></div>").attr("id", opt.id).addClass("line");

		$("<label></label>").attr("for", opt.id + "_input").text(opt.label).appendTo($div);
		$("<input />").attr({
			id: opt.id + "_input",
			type: opt.type,
			placeholder: opt.label,
			value: opt.val
		}).appendTo($div);

		return $div;
	},
	addTextarea: function(opt) {
		var $textarea = $("<textarea></textarea>").text(opt.textarea);

		if (opt.class)
			$textarea.addClass(opt.class)

		return $textarea;
	},
	addText: function(opt) {
		var $p = $("<p></p>");

		if (opt.text)
			$p.text(opt.text);
		else
			$p.html(opt.html);

		if (opt.style)
			$p.css(opt.style);

		if (opt.class)
			$p.addClass(opt.class)

		return $p;
	},
	addImg: function(opt) {
		var $img = $("<img />").attr("src", opt.src);

		if (opt.class)
			$img.addClass(opt.class)

		return $img;
	},
	addLink: function(opt) {
		var $a = $("<a class=link></a>").text(opt.link);

		if (opt.href)
			$a.attr("href", opt.href);

		if (opt.click)
			$a.click(opt.click);

		return $a;
	},
	addButton: function(opt) {
		var $a = $('<input type="button" />').val(opt.value);

		if (opt.click) {
			$a.click(opt.click);
			this.$form.find("input").keypress(function(e) {
				if (!e.shiftKey && e.keyCode == 13) {
					$a.click();
				}
			});
		}

		return $a;
	},
	makeTooltip: function(text, wait, id) {
		var $div = $("<div></div>").addClass("tooltipInfo"),
			$p = $("<p></p>").text(text);

		if (typeof(id) === "string") {
			$div.attr("id", id);

			var $old = $("div#" + id + ".tooltipInfo");
			if ($old[0]) {
				console
				$old.replaceWith($div);
			} else {
				$div.appendTo("div#emptyblock")
			}
		} else {
			$div.appendTo("div#emptyblock")
		}

		$div.append($p).width($p.outerWidth(true) + 1);

		var f = function() {
			$div.animate({
				opacity: 0,
				height: 0,
				padding: 0,
				margin: "0 auto"
			}, 400, "swing", function() {
				$div.remove();
			});
		};

		$div.click(f);

		setTimeout(f, (wait) ? wait : 2000);
	}
});