<?php
if (isset($_SERVER["WINDIR"])) {
	$my_config = [
		"SALON" => "Zone de T.E.S.T. et de C.R.A.S.H.",
		"DESCRIPTION" => "Pour une utilisation sans danger : <a href=\"http://chat.12z.fr/\">http://chat.12z.fr/</a>",
		"SERVER.IP" => "local.12z.fr:5000"
	];
} else {
	$a = [
		(rand(0, 240)  <= 120) ? "fuir" : "voir",
		(rand(0, 2400)  <= 1200) ? "finissez" : "commencez"
	];

	$my_config = [
		"TITRE" => "Le C.H.A.T.",
		"SALON" => "Le C.H.A.T.",
		"DESCRIPTION" => "La description a disparu !", //"Pataugez là où vous voulez pour " . $a[0] . " le chat, mais " . $a[1] . " par douze !",
		"SERVER.IP" => "vps.12z.fr"
	];
}

$title = isset($my_config["TITRE"]) ? $my_config["TITRE"] : $my_config["SALON"];
?>
<!DOCTYPE html>
<html>
	<head>
		<link rel="stylesheet/less" type="text/css" href="design/styles.less?<?=time()?>" />
		<?php if (isset($_SERVER["WINDIR"])): ?>
			<script>less = { env: "development" }; __debug = true;</script>
		<?php endif; ?>
		<script src="javascript/lib/less.min.js"></script>
		<script type="text/javascript" src="javascript/require.file.js" async="true"></script>
		<meta name="viewport" content="initial-scale=1, maximum-scale=1">
		<meta name="requirejs.dir" content="javascript/" />
		<meta name="server.ip" content="<?=$my_config["SERVER.IP"]?>" />
		<meta charset="utf-8">
		<title><?=$title?> - Le chat par 12z.</title>
		<!-- twitter -->
		<meta name="twitter:card" content="summary" />
		<meta name="twitter:title" content="Le C.H.A.T. - Le chat par 12z." />
		<meta name="twitter:description" content="Un espace de discussion sur l'actu high-tech, la programmation, les jeux..." />
		<meta name="twitter:image" content="http://chat.12z.fr/design/img/mookup.png" />
		<meta name="twitter:url" content="http://chat.12z.fr/" />
	</head>
	<body>
		<div id="header">
			<div id="logo">
				<h1><?=$my_config["SALON"]?> - <span id="equa_a">12</span></font><sup>z</sup></h1>
				<p><?=$my_config["DESCRIPTION"]?></p>
			</div>
			<div id="submenu">
				<div id="fullscreen">
					<a>FULLSCREEN</a>
				</div>
				<div id="changelog">
					<a>( Changelog )</a>
				</div>
			</div>
		</div>
		<div class="content">
			<div id="chat" class="chatcontent normal">
				<div id="minimap">
					<div id="chat_mini" class="chatcontent">
						<div id="messages_chat_mini" class="listemessages chatdisplay"></div>
						<div id="focus_window"></div>
					</div>
				</div>
				<div id="messages_chat" class="listemessages chatdisplay" style="height: 432px;">
				</div>
				<div id="input_chat" class="disabled clickable chatdisplay">
					<div class="pm c0">
						<div class="pseudo">Anonyme</div><div class="text" id="inputHTML">Connecte toi ou choisi un pseudo en cliquant ici. ;)</div>
						<font><a class="n">52 / 365</a></font>
					</div>
				</div>
				<div id="emptyblock"></div>
			</div>
		</div>
		<div id="drag-overlay" onclick="$(this).hide()">
			<div>
				<h1>Upload</h1>
			</div>
		</div>
	</body>
</html>