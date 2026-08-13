<?php
declare(strict_types=1);

ini_set('display_errors', '0');

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');

$requestId = bin2hex(random_bytes(8));

function respond(int $status, string $error = ''): never
{
    global $requestId;
    http_response_code($status);
    echo json_encode(
        $error === '' ? ['ok' => true, 'request_id' => $requestId] : ['ok' => false, 'error' => $error, 'request_id' => $requestId],
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );
    exit;
}

function cleanText(mixed $value, int $maxLength): string
{
    if (!is_string($value)) {
        return '';
    }

    $value = trim(str_replace(["\r\n", "\r"], "\n", $value));
    if (!mb_check_encoding($value, 'UTF-8') || preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', $value)) {
        respond(422, 'invalid_fields');
    }
    if (mb_strlen($value, 'UTF-8') > $maxLength) {
        respond(422, 'invalid_fields');
    }
    return $value;
}

function rateLimit(array $config, string $ip): void
{
    $rateDir = (string) ($config['rate_dir'] ?? '');
    $rateSecret = (string) ($config['rate_secret'] ?? '');
    if ($rateDir === '' || $rateSecret === '' || (!is_dir($rateDir) && !mkdir($rateDir, 0700, true))) {
        respond(503, 'temporarily_unavailable');
    }

    $key = hash_hmac('sha256', $ip, $rateSecret);
    $path = $rateDir . '/' . $key . '.json';
    $handle = fopen($path, 'c+');
    if ($handle === false || !flock($handle, LOCK_EX)) {
        if (is_resource($handle)) fclose($handle);
        respond(503, 'temporarily_unavailable');
    }

    $now = time();
    $state = json_decode(stream_get_contents($handle) ?: '{}', true);
    $events = array_values(array_filter(is_array($state['events'] ?? null) ? $state['events'] : [], static fn($time): bool => is_int($time) && $time > $now - 600));
    if (count($events) >= 5) {
        flock($handle, LOCK_UN);
        fclose($handle);
        header('Retry-After: 600');
        respond(429, 'too_many_requests');
    }

    $events[] = $now;
    rewind($handle);
    ftruncate($handle, 0);
    fwrite($handle, json_encode(['events' => $events], JSON_THROW_ON_ERROR));
    fflush($handle);
    flock($handle, LOCK_UN);
    fclose($handle);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond(405, 'method_not_allowed');
}

$contentType = strtolower(trim(explode(';', (string) ($_SERVER['CONTENT_TYPE'] ?? ''))[0]));
if ($contentType !== 'application/json') {
    respond(415, 'unsupported_media_type');
}

$configPath = dirname(__DIR__, 3) . '/private/rendart/telegram.php';
if (!is_file($configPath)) {
    respond(503, 'temporarily_unavailable');
}
$config = require $configPath;
if (!is_array($config)) {
    respond(503, 'temporarily_unavailable');
}

$origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
$allowedOrigins = is_array($config['allowed_origins'] ?? null) ? $config['allowed_origins'] : [];
if (!in_array($origin, $allowedOrigins, true)) {
    respond(403, 'forbidden');
}

$contentLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
if ($contentLength <= 0 || $contentLength > 16384) {
    respond($contentLength > 16384 ? 413 : 400, $contentLength > 16384 ? 'payload_too_large' : 'invalid_json');
}

$raw = file_get_contents('php://input', false, null, 0, 16385);
if ($raw === false || strlen($raw) > 16384) {
    respond(413, 'payload_too_large');
}

try {
    $payload = json_decode($raw, true, 16, JSON_THROW_ON_ERROR);
} catch (JsonException) {
    respond(400, 'invalid_json');
}
if (!is_array($payload) || array_is_list($payload)) {
    respond(400, 'invalid_json');
}

if (cleanText($payload['website'] ?? '', 200) !== '') {
    respond(200);
}

if (($payload['consent'] ?? null) !== true) {
    respond(422, 'consent_required');
}
$consentVersion = cleanText($payload['consentVersion'] ?? '', 80);
$allowedConsentVersions = is_array($config['consent_versions'] ?? null) ? $config['consent_versions'] : [];
if (!in_array($consentVersion, $allowedConsentVersions, true)) {
    respond(422, 'consent_required');
}

$contact = cleanText($payload['contact'] ?? '', 200);
if ($contact === '') {
    respond(422, 'contact_required');
}

$audience = cleanText($payload['audience'] ?? '', 20);
if (!in_array($audience, ['', 'brand', 'designer', 'other'], true)) {
    respond(422, 'invalid_fields');
}

$materials = cleanText($payload['materials'] ?? '', 500);
if ($materials !== '' && (!filter_var($materials, FILTER_VALIDATE_URL) || !in_array(parse_url($materials, PHP_URL_SCHEME), ['http', 'https'], true))) {
    respond(422, 'invalid_fields');
}

$fields = [
    'name' => cleanText($payload['name'] ?? '', 120),
    'contact' => $contact,
    'audience' => $audience,
    'message' => cleanText($payload['message'] ?? '', 1500),
    'company' => cleanText($payload['company'] ?? '', 200),
    'deadline' => cleanText($payload['deadline'] ?? '', 120),
    'materials' => $materials,
    'page' => cleanText($payload['page'] ?? '', 120),
    'source' => cleanText($payload['sourceCta'] ?? '', 120),
    'referrer' => cleanText($payload['referrer'] ?? '', 500),
];

rateLimit($config, (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));

$audiences = ['brand' => 'Интерьерный бренд', 'designer' => 'Дизайнер или архитектор', 'other' => 'Другое', '' => 'Не указано'];
$lines = [
    'Новая заявка RENDART',
    '',
    'Имя: ' . ($fields['name'] !== '' ? $fields['name'] : 'Не указано'),
    'Связь: ' . $fields['contact'],
    'Кто: ' . $audiences[$fields['audience']],
];

$labels = ['message' => 'Задача', 'company' => 'Компания и роль', 'deadline' => 'Сроки', 'materials' => 'Материалы', 'page' => 'Страница', 'source' => 'Источник', 'referrer' => 'Переход с'];
foreach ($labels as $key => $label) {
    if ($fields[$key] !== '') $lines[] = $label . ': ' . $fields[$key];
}

$utm = is_array($payload['utm'] ?? null) ? $payload['utm'] : [];
$utmParts = [];
foreach (['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as $key) {
    $value = cleanText($utm[$key] ?? '', 120);
    if ($value !== '') $utmParts[] = $key . '=' . $value;
}
if ($utmParts !== []) $lines[] = 'UTM: ' . implode(' · ', $utmParts);

$message = mb_substr(implode("\n", $lines), 0, 3900, 'UTF-8');
$botToken = (string) ($config['bot_token'] ?? '');
$chatId = (string) ($config['chat_id'] ?? '');
if ($botToken === '' || $chatId === '') {
    respond(503, 'temporarily_unavailable');
}

$curl = curl_init('https://api.telegram.org/bot' . $botToken . '/sendMessage');
if ($curl === false) respond(503, 'temporarily_unavailable');
curl_setopt_array($curl, [
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode(['chat_id' => $chatId, 'text' => $message, 'link_preview_options' => ['is_disabled' => true]], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CONNECTTIMEOUT => 3,
    CURLOPT_TIMEOUT => 10,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
]);
$telegramResponse = curl_exec($curl);
$telegramStatus = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
$curlError = curl_errno($curl);
curl_close($curl);

$telegramBody = is_string($telegramResponse) ? json_decode($telegramResponse, true) : null;
if ($curlError !== 0 || $telegramStatus < 200 || $telegramStatus >= 300 || !is_array($telegramBody) || ($telegramBody['ok'] ?? false) !== true) {
    error_log('RENDART lead delivery failed request_id=' . $requestId . ' curl=' . $curlError . ' http=' . $telegramStatus);
    respond(502, 'delivery_failed');
}

respond(200);
