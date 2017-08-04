<?php
	function getBase() {
		return $_SERVER["REQUEST_SCHEME"] . "://" . $_SERVER["SERVER_NAME"];
	}

	function getUrl() {
		return getBase() . $_SERVER["REQUEST_URI"];
	}

	function getMe() {
		return getBase() . $_SERVER["SCRIPT_NAME"];
	}

	function redirectTo($url) {
		if (filter_var($url, FILTER_VALIDATE_URL))
			$url = htmlentities($url);
			$url2 = addslashes($url);
			die("
<html>
	<head>
		<noscript><meta http-equiv=\"refresh\" content=\"0; url='$url'\" /></noscript>
	</head>
	<body onload=\"window.location = '$url2';\">

	</body>
</html>
");
	}

	/*if (isset($_GET["url"]))
		redirectTo($_GET["url"]);*/

	$abc = explode(getMe() . "?=", getUrl());
	$url = end($abc);

	if (!empty($url)) {
		redirectTo($url);
	}

	die(header("HTTP/1.0 404 Not Found")."HTTP/1.0 404 Not Found");
?>