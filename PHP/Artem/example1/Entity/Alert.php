<?php

namespace SafeStartApi\Entity;

use SafeStartApi\Base\CommentedEntity as BaseEntity;
use Doctrine\ORM\Mapping as ORM;
use SafeStartApi\Entity\Vehicle;

/**
 * @ORM\Entity
 * @ORM\HasLifecycleCallbacks
 * @ORM\Table(name="inspection_alerts")
 *
 */
class Alert extends BaseEntity
{
    // statuses
    const STATUS_NEW = 'new';
    const STATUS_CLOSED = 'closed';

    //actions
    const ACTION_STATUS_CHANGED_CLOSED = 'alert_closed';
    const ACTION_STATUS_CHANGED_NEW = 'alert_reopened';
    const ACTION_REFRESHED = 'alert_refreshed';

    /**
     * Constructor
     */
    public function __construct()
    {
        $this->status = self::STATUS_NEW;
    }

    /**
     * @var string
     */
    protected $comment_entity = 'alert';

    /**
     * @ORM\Id
     * @ORM\Column(type="integer")
     * @ORM\GeneratedValue(strategy="IDENTITY")
     */
    protected $id;

    /**
     * @ORM\ManyToOne(targetEntity="CheckList", inversedBy="alerts")
     * @ORM\JoinColumn(name="check_list_id", referencedColumnName="id")
     **/
    protected $check_list;

    /**
     * @ORM\ManyToOne(targetEntity="Field", inversedBy="alerts")
     * @ORM\JoinColumn(name="field_id", referencedColumnName="id")
     **/
    protected $field;

    /**
     * @ORM\ManyToOne(targetEntity="Vehicle", inversedBy="alerts")
     * @ORM\JoinColumn(name="vehicle_id", referencedColumnName="id")
     **/
    protected $vehicle;

    /**
     * @ORM\Column(type="text", nullable=true)
     */
    protected $description;

    /**
     * @ORM\Column(type="json_array", nullable=true)
     *
     * PHP array using json_encode() and json_decode()
     */
    protected $images = '';

    /**
     * @ORM\Column(type="string")
     */
    protected $status;

    /**
     * @ORM\Column(type="datetime", name="creation_date")
     */
    protected $creation_date;

    /**
     * @ORM\Column(type="datetime", name="update_date")
     */
    protected $update_date;

    /**
     * @ORM\Column(type="boolean")
     */
    protected $deleted = 0;

    /**
     * @ORM\Column(type="json_array", nullable=true)
     *
     * PHP array using json_encode() and json_decode()
     */
    protected $history = '';

    /**
     * @ORM\PrePersist
     */
    public function prePersist()
    {
        if (!$this->creation_date) $this->setCreationDate(new \DateTime());
        $this->setUpdateDate(new \DateTime());
    }

    /**
     * Get id
     *
     * @return integer
     */
    public function getId()
    {
        return $this->id;
    }


    /**
     * Set comment
     *
     * @param $description
     * @return Alert
     */
    public function setDescription($description)
    {
        $this->description = strip_tags($description);

        return $this;
    }

    /**
     * Get comment
     *
     * @return string
     */
    public function getDescription()
    {
        return $this->description;
    }

    /**
     * Set images
     *
     * @param array $images
     * @return Alert
     */
    public function setImages($images)
    {
        $this->images = json_encode($images);

        return $this;
    }

    /**
     * Get images
     *
     * @return array
     */
    public function getImages()
    {
        return $this->images ? json_decode($this->images, true) : array();
    }

    /**
     * Set images
     *
     * @param array $history
     * @return Alert
     */
    public function setHistory($history)
    {
        $currentHistory = $this->getHistory();
        $currentHistory = array_merge($currentHistory, $history);
        $this->history = json_encode($currentHistory);
        return $this;
    }

    public function addHistoryItem($action = '')
    {
        $this->setHistory(array(array(
            'date' => time(),
            'user' => \SafeStartApi\Application::getCurrentUser()->toInfoArray(),
            'action' => $action
        )));
    }

    public function getRefreshedTimes()
    {
        $count = 0;
        $currentHistory = $this->getHistory();
        foreach ($currentHistory as $historyItem) {
            if (isset($historyItem['action']) && $historyItem['action'] == self::ACTION_REFRESHED) $count++;
        }
        return $count;
    }

    /**
     * Get history
     *
     * @return array
     */
    public function getHistory()
    {
        return $this->history ? json_decode($this->history, true) : array();
    }

    /**
     * Set check_list
     *
     * @param \SafeStartApi\Entity\CheckList $checkList
     * @return Alert
     */
    public function setCheckList(\SafeStartApi\Entity\CheckList $checkList = null)
    {
        $this->check_list = $checkList;

        return $this;
    }

    /**
     * Get check_list
     *
     * @return \SafeStartApi\Entity\CheckList
     */
    public function getCheckList()
    {
        return $this->check_list;
    }

    /**
     * Set field
     *
     * @param \SafeStartApi\Entity\Field $field
     * @return Alert
     */
    public function setField(\SafeStartApi\Entity\Field $field = null)
    {
        $this->field = $field;

        return $this;
    }

    /**
     * Get field
     *
     * @return \SafeStartApi\Entity\Field
     */
    public function getField()
    {
        return $this->field;
    }

    /**
     * Set vehicle
     *
     * @param \SafeStartApi\Entity\Vehicle $vehicle
     * @return Alert
     */
    public function setVehicle(Vehicle $vehicle = null)
    {
        $this->vehicle = $vehicle;

        return $this;
    }

    /**
     * Get vehicle
     *
     * @return \SafeStartApi\Entity\Vehicle
     */
    public function getVehicle()
    {
        return $this->vehicle;
    }

    /**
     * Set field
     *
     * @param $status
     * @throws \InvalidArgumentException
     * @return Alert
     */
    public function setStatus($status)
    {
        if (!in_array($status, array(self::STATUS_NEW, self::STATUS_CLOSED))) {
            throw new \InvalidArgumentException("Invalid alert status");
        }

        $this->status = $status;

        return $this;
    }

    /**
     * Get field
     *
     * @return \SafeStartApi\Entity\Field
     */
    public function getStatus()
    {
        return $this->status;
    }

    public function getThumbnail()
    {
        $src = '';
        if (!empty($this->images) && isset($this->getImages()[0])) $src = '/api/image/' . $this->getImages()[0] . '/' . \SafeStartApi\Controller\Plugin\UploadPlugin::THUMBNAIL_SMALL;
        return $src;
    }

    /**
     * Set creation_date
     *
     * @param \DateTime $creationDate
     * @return CheckList
     */
    public function setCreationDate($creationDate)
    {
        $this->creation_date = $creationDate;

        return $this;
    }

    /**
     * Get creation_date
     *
     * @return \DateTime
     */
    public function getCreationDate()
    {
        return $this->creation_date;
    }

    /**
     * Set deleted
     *
     * @param boolean $deleted
     * @return Alert
     */
    public function setDeleted($deleted)
    {
        $this->deleted = $deleted;

        return $this;
    }

    /**
     * Get deleted
     *
     * @return boolean
     */
    public function getDeleted()
    {
        return $this->deleted;
    }

    /**
     * Set creation_date
     *
     * @param \DateTime $creationDate
     * @return Alert
     */
    public function setUpdateDate($creationDate)
    {
        $this->update_date = $creationDate;

        return $this;
    }

    /**
     * Get creation_date
     *
     * @return \DateTime
     */
    public function getUpdateDate()
    {
        return $this->update_date;
    }

    /**
     * Convert the object to an array.
     *
     * @return array
     */
    public function toArray()
    {
        $data = array(
            'id' => $this->getId(),
            'status' => $this->getStatus(),
            'title' => $this->field ? ($this->field->getAlertDescription() ? $this->field->getAlertDescription() : $this->field->getAlertTitle()) : '',
            'alert_description' => $this->field ? ($this->field->getAlertDescription() ? $this->field->getAlertDescription() : $this->field->getAlertTitle()) : '',
            'field' => $this->field ? $this->field->toArray() : null,
            'vehicle' => $this->getVehicle()->toInfoArray(),
            'user' => $this->check_list ? $this->check_list->getUser()->toInfoArray() : array(),
            'description' => $this->getDescription(),
            'images' => $this->getImages(),
            'thumbnail' => $this->getThumbnail(),
            'comments' => $this->getComments(),
            'creation_date' => $this->getCreationDate()->getTimestamp(),
            'update_date' => $this->getUpdateDate()->getTimestamp(),
            'history' => $this->getHistory(),
            'refreshed_times' => $this->getRefreshedTimes()
        );
        return $data;
    }
}
