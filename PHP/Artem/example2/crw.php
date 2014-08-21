<? //cli image crawler
  $params = getopt('u:l:', ['report::']);
    if (!array_key_exists('l', $params)) {
      echo <<<USAGE
WRITE ME
USAGE;
    }

  function urlsLister ($base) {
    $urls = [$base];
    $offs = 0;
      do {
        $url = $urls[$offs];
        $newUrls = (yield $url);//send next url and get new portion of urls
          if (is_array($newUrls)) {
            array_walk($newUrls, function ($url) use (&$urls) {
                if (!in_array($url, $urls)) {
                  $urls[] = $url;
                }
            });
          }
          else {
            $offs++;
          }
      } while (false !== $newUrls && array_key_exists($offs, $urls));
  };

  function logger ($file, callable $format) {
    try {
      $handle = fopen($file, 'a');
        while (false !== ($entry = yield))
          fwrite($handle, $format($entry));
    } catch (Exception $e) {
      throw $e;
    } finally {
        if ($handle)
          fclose($handle);
    }
  }

  function reporter ($file) {
    try {
      $log = [];
        while ($data = (yield))
          $log[] = $data;
    }
    catch (Exception $e) {
      //todo: log exceptions
    }
    finally {
      usort($log, function ($a, $b) {//TODO: try to use SplHeap
        return $b->qty-$a->qty;
      });
      file_put_contents($file, join(PHP_EOL, array_map(function ($entry) {
        return sprintf("%d\t%s", $entry->qty, $entry->url);
      }, $log)));
    }
  }

  $rep = reporter(array_key_exists('report', $params) ? $params['report'] : 'report.dat');
  $errLog = logger('err.log', function ($entry) {
    return sprintf("[%s] %s \n", date(DATE_ATOM), $entry);
  });

  $dd = new \DOMDocument();
  libxml_use_internal_errors(true);//prevent raising of errors

  libxml_set_streams_context(stream_context_create(['http' => [
    'user_agent' => 'Opera/9.80 (Windows NT 6.2; Win64; x64) Presto/2.12.388 Version/12.16'
   ]], [
    'notification' =>
      function ($code, $severity, $msg, $msgCode, $bytes, $bytesTotal) use (&$url, &$iterations) {//just for page download progress
          if ($code == STREAM_NOTIFY_PROGRESS) {
            echo "\r", $iterations, ' [', $bytes, !$bytesTotal ?: '/'.$bytesTotal, '] ', str_repeat(' ', 20);
          }
      }
  ]));

  $iterations = 0;

    foreach ($urls = urlsLister($params['u']) as $url) {
        if (@$dd->loadHTMLFile($url, LIBXML_DTDLOAD | LIBXML_NOCDATA | LIBXML_NOERROR | LIBXML_NOWARNING) === false) {
            foreach (libxml_get_errors() as $error) {
              $errLog->send(sprintf('%s in %s at line %d', $error->message, $error->file, $error->line));
            }
          libxml_clear_errors();
          continue;
        }

      $urls->send(array_map(function ($node) use ($url) {//simple urls resolver
          $href = $node->getAttribute('href');
            if (parse_url($href, PHP_URL_HOST) &&
                strtolower(parse_url($href, PHP_URL_HOST)) == strtolower(parse_url($url, PHP_URL_HOST))) {
              return $href;
            }
            else {
              switch ($href[0]) {
                case '/': return 'http://'.parse_url($url, PHP_URL_HOST).$href;
                case '#': return $url;
                case '?':
                default:
                  return dirname($url).'/'.basename($url).'/'.$href;
              }
            }
          echo '!!!!', $node->getAttribute('href'), PHP_EOL;
        },
        array_filter(iterator_to_array((new \DOMXPath($dd))->query('//a'), false), function ($node) use ($url) {//filter hrefs
        $href = $node->getAttribute('href');
        return
          ($href !== '') && //skip empty hrefs
          !(parse_url($href, PHP_URL_SCHEME) && 'http' !== strtolower(parse_url($href, PHP_URL_SCHEME))) &&//skip non http hrefs
          !(parse_url($href, PHP_URL_HOST) && strtolower(parse_url($href, PHP_URL_HOST)) !== strtolower(parse_url($url, PHP_URL_HOST)))//skip external hrefs
          ;
      })));

      $rep->send((object)[
        'url' => $url,
        'qty' => (new \DOMXPath($dd))->query('//img')->length
      ]);
      $iterations++;
        if (array_key_exists('l', $params) && (int)$params['l'] && $params['l'] < $iterations) {
          $urls->send(false);//stop execution
        }
    }


