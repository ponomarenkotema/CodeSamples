<?php

namespace SafeStartApi\Entity;

use SafeStartApi\Base\Entity as BaseEntity;
use Doctrine\ORM\Mapping as ORM;


/**
 * @ORM\Entity
 * @ORM\Table(name="comments")
 */
class Comment extends BaseEntity
{
    /**
     * @ORM\Id
     * @ORM\Column(type="integer")
     * @ORM\GeneratedValue(strategy="AUTO")
     */
    protected $id;

    /**
     * @ORM\Column(type="integer")
     */
    protected $parent_id = 0;

    /**
     * @ORM\ManyToOne(targetEntity="User", inversedBy="comments")
     * @ORM\JoinColumn(name="user_id", referencedColumnName="id", onDelete="CASCADE")
     */
    protected $user;

    /**
     * @ORM\Column(type="string")
     */
    protected $entity = 'system';

    /**
     * @ORM\Column(type="integer")
     */
    protected $entity_id = 0;

    /**
     * @ORM\Column(type="text", nullable=false)
     */
    protected $content = '';

    /**
     * @ORM\Column(type="datetime")
     */
    protected $add_date;

    /**
     * @ORM\Column(type="datetime")
     */
    protected $update_date;

    /**
     *
     */
    public function setUpdated()
    {
        // WILL be saved in the database
        $this->update_date = new \DateTime("now");
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
     * Set parent_id
     *
     * @param integer $parentId
     * @return Comment
     */
    public function setParentId($parentId)
    {
        $this->parent_id = $parentId;

        return $this;
    }

    /**
     * Get parent_id
     *
     * @return integer
     */
    public function getParentId()
    {
        return $this->parent_id;
    }

    /**
     * Set entity
     *
     * @param string $entity
     * @return Comment
     */
    public function setEntity($entity)
    {
        $this->entity = $entity;

        return $this;
    }

    /**
     * Get entity
     *
     * @return string
     */
    public function getEntity()
    {
        return $this->entity;
    }

    /**
     * Set entity_id
     *
     * @param integer $entityId
     * @return Comment
     */
    public function setEntityId($entityId)
    {
        $this->entity_id = $entityId;

        return $this;
    }

    /**
     * Get entity_id
     *
     * @return integer
     */
    public function getEntityId()
    {
        return $this->entity_id;
    }

    /**
     * Set content
     *
     * @param string $content
     * @return Comment
     */
    public function setContent($content)
    {
        $this->content = $content;

        return $this;
    }

    /**
     * Get content
     *
     * @return string
     */
    public function getContent()
    {
        return $this->content;
    }

    /**
     * Set add_date
     *
     * @param \DateTime $addDate
     * @return Comment
     */
    public function setAddDate($addDate)
    {
        $this->add_date = $addDate;

        return $this;
    }

    /**
     * Get add_date
     *
     * @return \DateTime
     */
    public function getAddDate()
    {
        return $this->add_date;
    }

    /**
     * Set update_date
     *
     * @param \DateTime $updateDate
     * @return Comment
     */
    public function setUpdateDate($updateDate)
    {
        $this->update_date = $updateDate;

        return $this;
    }

    /**
     * Get update_date
     *
     * @return \DateTime
     */
    public function getUpdateDate()
    {
        return $this->update_date;
    }

    /**
     * Set user
     *
     * @param \SafeStartApi\Entity\User $user
     * @return Comment
     */
    public function setUser(\SafeStartApi\Entity\User $user = null)
    {
        $this->user = $user;

        return $this;
    }

    /**
     * Get user
     *
     * @return \SafeStartApi\Entity\User
     */
    public function getUser()
    {
        return $this->user;
    }

    /**
     * @return array
     */
    public function toArray()
    {
        return array(
            'id' => $this->id,
            'user_id' => $this->getUser()->getId(),
            'user' => $this->getUser()->toInfoArray(),
            'item_id' => $this->getEntityId(),
            'update_date' => date('d/m/Y H:i', $this->getUpdateDate()->getTimestamp()),
            'content' => $this->getContent()
        );
    }
}
