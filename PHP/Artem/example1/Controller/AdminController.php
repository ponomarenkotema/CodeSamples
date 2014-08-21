<?php

namespace SafeStartApi\Controller;

use SafeStartApi\Base\AdminAccessRestController;

/**
 * Class AdminController
 * @package SafeStartApi\Controller
 */
class AdminController extends AdminAccessRestController
{
    /**
     * @return mixed
     */
    public function getCompaniesAction()
    {

        if (!$this->_requestIsValid('admin/getcompanies')) return $this->_showBadRequest();

        $this->answer = array();

        $query = $this->em->createQuery('SELECT c FROM SafeStartApi\Entity\Company c WHERE c.deleted = 0');
        $items = $query->getResult();

        foreach ($items as $item) {
            $this->answer[] = $item->toArray();
        }

        return $this->AnswerPlugin()->format($this->answer);
    }

    /**
     * @return mixed
     */
    public function updateCompanyAction()
    {
        if (!$this->_requestIsValid('admin/updatecompany')) return $this->_showBadRequest();
        $actionAdd = true;
        $companyId = (int)$this->params('id');
        if ($companyId) {
            $company = $this->em->find('SafeStartApi\Entity\Company', $companyId);
            if (!$company) {
                $this->answer = array(
                    "errorMessage" => "Company not found."
                );
                return $this->AnswerPlugin()->format($this->answer, 404);
            }
            $actionAdd = false;
        } else {
            $company = new \SafeStartApi\Entity\Company();
        }

        // set company admin
        $userRep = $this->em->getRepository('SafeStartApi\Entity\User');
        $user = $userRep->findOneBy(array('email' => $this->data->email));

        if (!$user) {
            $user = new \SafeStartApi\Entity\User();
            $user->setEmail($this->data->email);
            $user->setFirstName($this->data->firstName);
            $user->setUsername($this->data->email);
            $user->setRole('companyAdmin');
            $this->em->persist($user);
        } else if ($actionAdd) {
            $adminForCompany = $this->em->getRepository('SafeStartApi\Entity\Company')->findOneBy(array(
                'admin' => $user,
                'deleted' => 0,
            ));
            if (!is_null($adminForCompany)) return $this->_showAdminAlreadyInUse();
        }

        $user->setEnabled(1);
        $user->setDeleted(0);

        // set company data
        $company->setTitle($this->data->title);
        $company->setAddress($this->data->address);
        $company->setPhone($this->data->phone);
        $company->setDescription($this->data->description);
        $company->setRestricted((bool)$this->data->restricted);
        $company->setMaxUsers($this->data->restricted ? (int)$this->data->max_users : 0);
        $company->setMaxVehicles($this->data->restricted ? (int)$this->data->max_vehicles : 0);
        if (isset($this->data->restricted)) {
            $expiryDate = new \DateTime();
            $expiryDate->setTimestamp((int)$this->data->expiry_date);
            $company->setExpiryDate($expiryDate);
        }
        $company->setAdmin($user);
        $this->em->persist($company);

        $user->setCompany($company);

        $this->em->flush();

        $this->answer = array(
            'done' => true,
            'companyId' => $company->getId(),
        );

        return $this->AnswerPlugin()->format($this->answer);

    }

    /**
     * @return mixed
     */
    public function sendCredentialsAction()
    {
        if (!$this->_requestIsValid('admin/sendcredentials')) return $this->_showBadRequest();

        $companyId = (int)$this->params('id');

        if ($companyId) {
            $company = $this->em->find('SafeStartApi\Entity\Company', $companyId);
            if (!$company) {
                $this->answer = array(
                    "errorMessage" => "Company not found."
                );
                return $this->AnswerPlugin()->format($this->answer, 404);
            }
        } else {
            $this->_showBadRequest();
        }

        $user = $company->getAdmin();
        $password = substr(md5($user->getId() . time() . rand()), 0, 6);
        $user->setPlainPassword($password);
        $this->em->flush();

        $config = $this->getServiceLocator()->get('Config');

        $this->MailPlugin()->send(
            'Credentials',
            $user->getEmail(),
            'creds.phtml',
            array(
                'username' => $user->getUsername(),
                'firstName' => $user->getFirstName(),
                'password' => $password,
                'siteUrl' => $config['params']['site_url'],
                'emailStaticContentUrl' => $config['params']['email_static_content_url']
            )
        );

        $this->answer = array(
            'done' => true,
            'companyId' => $company->getId(),
        );

        return $this->AnswerPlugin()->format($this->answer);
    }

    /**
     * @return mixed
     */
    public function deleteCompanyAction()
    {
        $companyId = (int)$this->params('id');

        $company = $this->em->find('SafeStartApi\Entity\Company', $companyId);
        if (!$company) {
            $this->answer = array(
                "errorMessage" => "Company not found."
            );
            return $this->AnswerPlugin()->format($this->answer, 404);
        }

        $company->setDeleted(1);
        $this->em->flush();

        $this->answer = array(
            'done' => true
        );

        return $this->AnswerPlugin()->format($this->answer);
    }

    /**
     * @return mixed
     */
    public function getDefaultChecklistAction()
    {
        $cache = \SafeStartApi\Application::getCache();
        $cashKey = "getForEditDefaultChecklist";
        if ($cache->hasItem($cashKey)) {
            $checklist = $cache->getItem($cashKey);
        } else {
            $query = $this->em->createQuery('SELECT f FROM SafeStartApi\Entity\DefaultField f WHERE f.deleted = 0');
            $items = $query->getResult();
            $checklist = $this->GetDataPlugin()->buildChecklistTree($items);
            $cache->setItem($cashKey, $checklist);
        }
        return $this->AnswerPlugin()->format($checklist);
    }

    /**
     * @return mixed
     */
    public function updateDefaultChecklistFiledAction()
    {
        $fieldId = (int)$this->params('id');
        if ($fieldId) {
            $field = $this->em->find('SafeStartApi\Entity\DefaultField', $fieldId);
            if (!$field) {
                $this->answer = array(
                    "errorMessage" => "Checklist Filed not found."
                );
                return $this->AnswerPlugin()->format($this->answer, 404);
            }
        } else {
            $field = new \SafeStartApi\Entity\DefaultField();
        }

        if (!empty($this->data->parentId) && $this->data->parentId != "NaN") {
            $parentField = $this->em->find('SafeStartApi\Entity\DefaultField', (int)$this->data->parentId);
            if (!$parentField) {
                $this->answer = array(
                    "errorMessage" => "Wrong parent filed."
                );
                return $this->AnswerPlugin()->format($this->answer, 401);
            }
            $field->setParent($parentField);
        }

        if (!in_array($this->data->type, array('root', 'text', 'group', 'radio', 'checkbox', 'photo', 'datePicker', 'label'))) {
            $this->answer = array(
                "errorMessage" => "Wrong field type."
            );
            return $this->AnswerPlugin()->format($this->answer, 401);
        }

        if ($this->data->type == 'root' && $this->data->parentId) $this->data->type = 'text';
        $field->setTitle($this->data->title);
        $field->setDescription($this->data->description);
        $field->setType($this->data->type);
        $field->setOrder((int)$this->data->sort_order);
        $field->setAdditional($this->data->type == 'root' ? (int)$this->data->additional : 0);
        $field->setAlertTitle(isset($this->data->alert_title) ? $this->data->alert_title : '');
        $field->setAlertDescription(isset($this->data->alert_description) ? $this->data->alert_description : '');
        $field->setTriggerValue($this->data->trigger_value);
        $field->setEnabled((int)$this->data->enabled);
        $field->setAlertCritical((int)$this->data->alert_critical);
        $this->em->persist($field);
        $field->setAuthor($this->authService->getStorage()->read());
        $this->em->flush();

        $cache = \SafeStartApi\Application::getCache();
        $cashKey = "getDefaultChecklist";
        $cashKey2 = "getForEditDefaultChecklist";
        if ($cache->hasItem($cashKey)) $cache->removeItem($cashKey);
        if ($cache->hasItem($cashKey2)) $cache->removeItem($cashKey2);

        $this->answer = array(
            'done' => true,
            'fieldId' => $field->getId(),
        );

        return $this->AnswerPlugin()->format($this->answer);

    }

    /**
     * @return mixed
     */
    public function deleteDefaultChecklistFiledAction()
    {
        $fieldId = (int)$this->params('id');

        $field = $this->em->find('SafeStartApi\Entity\DefaultField', $fieldId);
        if (!$field) {
            $this->answer = array(
                "errorMessage" => "Checklist Filed not found."
            );
            return $this->AnswerPlugin()->format($this->answer, 404);
        }

        $field->setDeleted(1);
        $this->em->flush();

        $this->answer = array(
            'done' => true
        );

        return $this->AnswerPlugin()->format($this->answer);
    }

    /**
     * @return mixed
     */
    public function getInspectionBreakdownsStatisticAction()
    {
        $statistic = array();

        $from = null;
        if (isset($this->data->from) && !empty($this->data->from)) {
            $from = new \DateTime();
            $from->setTimestamp((int)$this->data->from);
        } else {
            $from = new \DateTime();
            $from->setTimestamp(time() - 366 * 24 * 60 * 60);
        }

        $to = null;
        if (isset($this->data->to) && !empty($this->data->to)) {
            $to = new \DateTime();
            $to->setTimestamp((int)$this->data->to);
        } else {
            $to = new \DateTime();
        }

        $query = $this->em->createQuery('SELECT COUNT(r.id) as counts, r.key, r.additional FROM SafeStartApi\Entity\InspectionBreakdown r WHERE r.date >= :from AND  r.date <= :to GROUP BY r.key');
        $query->setParameter('from', $from)->setParameter('to', $to);
        $items = $query->getResult();
        $chart = array();
        if (!empty($items)) {
            foreach ($items as $item) {
                $chart[] = array(
                    'key' => $item['key'],
                    'count' => $item['counts'],
                    'additional' => $item['additional']
                );
            }
        }

        $statistic['chart'] = $chart;

        $this->answer = array(
            'done' => true,
            'statistic' => $statistic
        );

        return $this->AnswerPlugin()->format($this->answer);

    }

    /**
     * @return mixed
     */
    public function getCheckListsChangesStatisticAction()
    {
        $statistic = array();

        $from = null;
        if (isset($this->data->from) && !empty($this->data->from)) {
            $from = new \DateTime();
            $from->setTimestamp((int)$this->data->from);
        } else {
            $from = new \DateTime();
            $from->setTimestamp(time() - 366 * 24 * 60 * 60);
        }

        $to = null;
        if (isset($this->data->to) && !empty($this->data->to)) {
            $to = new \DateTime();
            $to->setTimestamp((int)$this->data->to);
        } else {
            $to = new \DateTime();
        }

        $query = $this->em->createQuery('SELECT r.key, r.prev_key, r.action, r.type, r.date, r.company_name FROM SafeStartApi\Entity\InspectionChanges r WHERE r.date >= :from AND  r.date <= :to GROUP BY r.prev_key');
        $query->setParameter('from', $from)->setParameter('to', $to);
        $items = $query->getResult();

        if (!empty($items)) {
            foreach ($items as $item) {
                $statistic[] = array(
                    'key' => $item['key'],
                    'prev_key' => $item['prev_key'],
                    'action' => $item['action'],
                    'type' => $item['type'],
                    'company_name' => $item['company_name'],
                    'date' => $item['date']->getTimestamp()
                );
            }
        }

        $this->answer = array(
            'done' => true,
            'statistic' => $statistic
        );

        return $this->AnswerPlugin()->format($this->answer);

    }
}
