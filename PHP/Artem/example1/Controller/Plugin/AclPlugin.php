<?php

namespace SafeStartApi\Controller\Plugin;

use Zend\Mvc\Controller\Plugin\AbstractPlugin;
use Zend\Permissions\Acl\Acl;
use Zend\Permissions\Acl\Role\GenericRole as Role;
use Zend\Permissions\Acl\Resource\GenericResource as Resource;

class AclPlugin extends AbstractPlugin
{
    protected $acl;

    public function __construct()
    {
        $this->acl = new Acl();

        $this->setRoles();
        $this->setResource();

        $this->setAccessList();
    }

    private function setRoles()
    {
        $this->acl->addRole(new Role('guest'));
        $this->acl->addRole(new Role('user'), 'guest');
        $this->acl->addRole(new Role('companyUser'), 'user');
        $this->acl->addRole(new Role('companyManager'), 'companyUser');
        $this->acl->addRole(new Role('companyAdmin'), 'companyManager');
        $this->acl->addRole(new Role('superAdmin'), 'companyAdmin');
    }

    private function setResource()
    {
        $this->acl->addResource(new Resource('adminPanel'));
        $this->acl->addResource(new Resource('userPanel'));
        $this->acl->addResource(new Resource('someResource'));
    }

    private function setAccessList()
    {
        $this->setAccess(array(
            'guest' => array(),
            'user' => array(),
            'companyUser' => array(
                array(
                    'resource' => 'adminPanel',
                    'action' => 'viewVehiclesPage',
                    'access' => 'allow'
                ),
                array(
                    'resource' => 'adminPanel',
                    'action' => 'viewAlertsPage',
                    'access' => 'allow'
                ),
            ),
            'companyManager' => array(
                array(
                    'resource' => 'adminPanel',
                    'action' => 'viewUsersPage',
                    'access' => 'allow'
                ),
                array(
                    'resource' => 'adminPanel',
                    'action' => 'viewCompanySettingsPage',
                    'access' => 'allow'
                ),
            ),
            'superAdmin' => array(
                array(
                    'resource' => 'adminPanel',
                    'action' => 'superAccess',
                    'access' => 'allow'
                ),
                array(
                    'resource' => 'adminPanel',
                    'action' => 'viewCompaniesPage',
                    'access' => 'allow'
                ),
                array(
                    'resource' => 'adminPanel',
                    'action' => 'viewSystemSettingsPage',
                    'access' => 'allow'
                ),
                array(
                    'resource' => 'adminPanel',
                    'action' => 'viewSystemStatisticPage',
                    'access' => 'allow'
                ),
                array(
                    'resource' => 'adminPanel',
                    'action' => 'viewCompanySettingsPage',
                    'access' => 'deny'
                ),
            )
        ));
    }

    private function setAccess($rolesList = array())
    {
        foreach ($rolesList as $role => $paramsArray) {
            foreach ($paramsArray as $params) {
                $this->acl->{$params['access']}($role, $params['resource'], $params['action']);
            }
        }
    }

    public function isAllowed($resource = null, $privilege = null)
    {
        if ($this->getController()->authService->hasIdentity()) {
            $user = $this->getController()->authService->getStorage()->read();
            $role = $user->getRole();
        } else {
            $role = 'guest';
        }
        return $this->acl->isAllowed($role, $resource, $privilege);
    }
}