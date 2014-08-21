<?php

namespace Presslife\SocialBundle\Model;


class ImageProcessor {

    private $image = null;
    private $imagine = null;


    public function __construct ($source = null) {
        if (extension_loaded('imagick')) {
            $this->imagine = new \Imagine\Imagick\Imagine();
        } else {
            $this->imagine = new \Imagine\Gd\Imagine();
        }
        
        if ($source) {
            $this->openImage($source);
        }
    }


    public function openImage ($source) {
        $this->image = $this->imagine->open($source);
    }


    public function save ($destination) {
        return $this->image->save($destination);
    }

    public function rotate(array $options)
    {
        if (!isset($options['angle'])) {
            throw new \Exception();
        }
        $filter = new \Imagine\Filter\Basic\Rotate($options['angle']);
        $filter->apply($this->image);
    }


    /**
     * The image is scaled to either the given height or the width, depending on the
     * ratio of the original image. That means that the image is scaled to fit into 
     * a "virtual" box with the dimensions given in the 
     * 
     * @param array $options
     * @throws \Exception
     */
    public function contain (array $options) {
        if (!isset($options['width']) && !isset($options['height'])) {
            throw new \Exception();
        }

        $imageBox = $this->image->getSize();
        if (isset($options['width'])) {
            // Scale by width
            if ($imageBox->getWidth() > $options['width']) {
                $imageBox = $imageBox->widen($options['width']);
            }
        }
        if (isset($options['height'])) {
            // Scale by height
            if ($imageBox->getHeight() > $options['height']) {
                $imageBox = $imageBox->heighten($options['height']);
            }
        }
        $this->image->resize($imageBox);
    }


    public function resize (array $options) {
        if (!isset($options['width']) || !isset($options['height'])) {
            throw new \Exception();
        }

        $imageBox = new \Imagine\Image\Box($options['width'], $options['height']);
        $this->image->resize($imageBox);
    }


    public function thumbnail (array $options) {
        if (!isset($options['width']) || !isset($options['height']) || !isset($options['destination'])) {
            throw new \Exception();
        }

        $size = new \Imagine\Image\Box($options['width'], $options['height']);
        $mode = \Imagine\Image\ImageInterface::THUMBNAIL_OUTBOUND;

        $this->image->thumbnail($size, $mode)
                ->save($options['destination']);
    }


    public function crop (array $options) {
        if (!isset($options['width']) || !isset($options['height']) || !isset($options['start'])) {
            throw new \Exception();
        }
        if (!isset($options['start']['x']) || !isset($options['start']['y'])) {
            throw new \Exception();
        }

        $startPoint = new \Imagine\Image\Point($options['start']['x'], $options['start']['y']);
        $cropBox = new \Imagine\Image\Box($options['width'], $options['height']);

        $this->image->crop($startPoint, $cropBox);
    }


    /**
     * The image is resized so that it completly covers the given dimensions.
     * Then the overlapping pieces are cropped depending on the given positioning.
     * This is useful if you need a fixed size for a thumbnail but the source
     * images have different ratios.
     *
     * @param array $options
     * @throws Exception
     * @throws \Exception
     */
    public function cover (array $options) {
        if (!isset($options['width']) || !isset($options['height']) || !isset($options['position']) || !in_array($options['position'], array(
                    'centermiddle',
                    'centertop'
                ))) {
            throw new \Exception();
        }

        $imageBox = $this->image->getSize();
        // Scale by width
        $imageBox = $imageBox->widen($options['width']);
        // Scale by height
        if ($imageBox->getHeight() < $options['height']) {
            $imageBox = $imageBox->heighten($options['height']);
            // We need to determine by x
            if ('center' == substr($options['position'], 0, 6)) {
                $start = array(
                    'x' => ($imageBox->getWidth() - $options['width']) / 2,
                    'y' => 0,
                );
            } else if ('left' == substr($options['position'], 0, 4)) {
                $start = array(
                    'x' => 0,
                    'y' => 0,
                );
            } else if ('right' == substr($options['position'], 0, 5)) {
                $start = array(
                    'x' => ($imageBox->getWidth() - $options['width']),
                    'y' => 0,
                );
            } else {
                var_dump(array('width', $options['position'], substr($options['position'], 0, 6), substr($options['position'], 0, 4), substr($options['position'], 0, 5)));
                throw new Exception('Unknown position');
            }
        } else {
            // We need to determine by height
            if ('center' == substr($options['position'], 0, 6)) {
                $start = array(
                    'x' => 0,
                    'y' => ($imageBox->getHeight() - $options['height']) / 2,
                );
            } else if ('top' == substr($options['position'], -3)) {
                $start = array(
                    'x' => 0,
                    'y' => 0,
                );
            } else if ('bottom' == substr($options['position'], -6)) {
                $start = array(
                    'x' => 0,
                    'y' => ($imageBox->getHeight() - $options['height']),
                );
            } else {
                var_dump(array('height', $options['position'], substr($options['position'], -7), substr($options['position'], -4), substr($options['position'], -7)));
                throw new Exception('Unknown position');
            }
            
        }
        $this->image->resize($imageBox);

        $this->crop(array(
            'width' => $options['width'],
            'height' => $options['height'],
            'start' => $start
        ));
    }

}