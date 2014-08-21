<?php
namespace SafeStartApi\Controller\Plugin;

use Zend\Mvc\Controller\Plugin\AbstractPlugin;
use Zend\View\Model\ViewModel;

class AnswerPlugin extends AbstractPlugin
{
    protected $viewModel;

    public function format($answer, $errorCode=0, $status=200, $type='json')
    {
        $this->getController()->getResponse()->setStatusCode($status);
        $this->viewModel = new ViewModel;
        $this->viewModel->setTemplate($type . '/response');
        $this->viewModel->setTerminal(true);
        $this->viewModel->setVariable('answer', $answer);
        $this->viewModel->setVariable('errorCode', $errorCode);
        $this->viewModel->setVariable('statusCode', $status);
        return $this->viewModel;
    }
}