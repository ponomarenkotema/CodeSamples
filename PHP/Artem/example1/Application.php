<?php

namespace SafeStartApi;


/**
 * Class Application
 * @package SafeStartApi
 */
class Application
{

    /**
     * @var \Zend\ServiceManager\ServiceManager
     */
    private static $serviceLocator = null;

    private static $em = null;

    private static $config = null;

    private static $cache = null;

    /**
     * @param \Zend\ServiceManager\ServiceManager $sl
     */
    public static function setCurrentControllerServiceLocator(\Zend\ServiceManager\ServiceManager $sl)
    {
        self::$serviceLocator = $sl;
    }

    public static function getCurrentControllerServiceLocator()
    {
        return self::$serviceLocator;
    }

    public static function getSessionManager()
    {
        return self::$serviceLocator ? self::$serviceLocator->get('Zend\Session\SessionManager') : null;
    }

    public static function getErrorLogger()
    {
        return self::$serviceLocator ? self::$serviceLocator->get('ErrorLogger') : null;
    }

    public static function getAuthService()
    {
        return self::$serviceLocator ? self::$serviceLocator->get('doctrine.authenticationservice.orm_default') : null;
    }

    public static function getCurrentUser()
    {
        return self::getAuthService()->hasIdentity() ? self::getAuthService()->getStorage()->read() : null;
    }

    public static function getEntityManager()
    {
        if (!self::$em) self::$em = self::$serviceLocator->get('Doctrine\ORM\EntityManager');
        return self::$em;
    }

    public static function getConfig()
    {
        if (!self::$config) self::$config = self::$serviceLocator->get('Config');
        return self::$config;
    }

    public static function getCache()
    {
        if (self::$cache == NULL) {
            if (phpversion('memcached')) {
                self::$cache = \Zend\Cache\StorageFactory::factory(array(
                    'adapter' => array(
                        'name' => 'memcached',
                        'options' => array(
                            'servers' => array(
                                array('localhost', 11211),
                            ),
                            'lib_options' => array(
                                'prefix_key' => 'AppKey',
                            ),
                        ),
                    ),
                    'plugins' => array(
                        'exception_handler' => array('throw_exceptions' => false),
                    ),
                ));
            } else if (version_compare(phpversion('apc'), '3.1.6') >= 0) {
                self::$cache = \Zend\Cache\StorageFactory::factory(array(
                    'adapter' => array(
                        'name' => 'apc',
                        'options' => array(
                            'namespace' => 'AppKey',
                        ),
                    ),
                    'plugins' => array(
                        'exception_handler' => array('throw_exceptions' => false),
                    ),
                ));
            } else {
                self::$cache = \Zend\Cache\StorageFactory::factory(array(
                    'adapter' => array(
                        'name' => 'filesystem',
                        'options' => array(
                            'namespace' => 'AppKey',
                            'cache_dir' => self::getFileSystemPath('data/cache/'),
                        ),
                    ),
                    'plugins' => array(
                        'exception_handler' => array('throw_exceptions' => false),
                        'serializer'
                    ),
                ));
            }

        }
        defined('APP_CACHE') || define('APP_CACHE', false);
        self::$cache->setCaching(APP_CACHE);
        return self::$cache;
    }

    private function __construct()
    {
    }

    private function __clone()
    {
    }
}