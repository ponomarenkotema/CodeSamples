<?php

namespace SafeStartApi\Override;

use Zend\Session\SessionManager;
use Zend\EventManager\EventManagerInterface;
use Zend\Session\Config\ConfigInterface;
use Zend\Session\Storage\StorageInterface;
use Zend\Session\SaveHandler\SaveHandlerInterface;
use Zend\Session\Exception;
use Zend\Session\Storage;
use Zend\Session\SaveHandler;

class ExtendSessionManager extends SessionManager
{
    /**
     * Set session ID
     *
     * Can safely be called in the middle of a session.
     *
     * @param  string $id
     * @return SessionManager
     */
    public static function statSetId($id)
    {
        $sid = defined('SID') ? constant('SID') : false;
        if ($sid !== false && self::statGetId()) {
            return false;
        }
        if (headers_sent()) {
            return false;
        }
        session_id($id);
    }


    /**
     * Get session ID
     *
     * Proxies to {@link session_id()}
     *
     * @return string
     */
    public static function statGetId()
    {
        return session_id();
    }
}