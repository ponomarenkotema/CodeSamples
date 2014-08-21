<?php

namespace SafeStartApi\Jobs;

use SafeStartApi\Base\ResqueTask;

class NewDbCheckListUploaded extends ResqueTask
{
    const COMMAND_NAME = 'new-db-checklist-uploaded';

    public function perform()
    {
        $command = 'resque run ' . self::COMMAND_NAME  .' --checkListId='. $this->args['checkListId'];
        $this->executeShelCommand($command);
    }
}