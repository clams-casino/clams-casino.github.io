---
title: "Elevation Mapping for Legged Robots in Vegetation"
---


Accurate estimation of the local elevation is important for legged robots to plan their next 
steps. A challenge for existing elevation mapping methods is when the robot is traversing through tall vegetation. In these cases, the tall vegetation blocks the robot's sensors from directly
measuring the ground underneath, causing the estimated elevation to be much higher than it really is.
This is bad for planning as the robot will be unable to traverse through these areas with high vegetation 
as it will think that there is something blocking the way. When really, such areas are traversable.
{: .text-justify}

![](/assets/images/elevation_mapping/cleannoisycompare.png)

The goal then is to develop an elevation estimator that is able to tell when the measurements
are being corrupted by traversable vegetation and to filter out these distractors.
{: .text-justify}


### Approach

The main idea is that if the robot has previous experiences of walking through tall vegetation, then these experiences
can be used to teach the robot that *"Hey, you really can walk through this stuff!"*. 
{: .text-justify}

Given a set of these robot trajectories/experiences, we can formulate elevation estimation as a supervised learning problem where the inputs are the robot's sensor measurements and the training targets are the ground-truth elevation extracted from these trajectories.
{: .text-justify}

For the inputs, we use robot-centered colored point clouds created from combining the measurements of several lidars and cameras on the robot.
The point cloud is colored in that we project the lidar points into the camera images and assign each point a color value if possible.
We hypothesized that the semantic information from images is crucial to disambiguating the lidar measurements of different types of natural features (grass, rocks, trees...).
{: .text-justify}

![](/assets/images/elevation_mapping/pcl_processing.png)

For the training targets, we're able to know the ground-truth elevation from the location of the robot's footholds during the 
trajectory. However, this is quite sparse of a target. So, we make the assumption that the ground is smooth to a certain extent
and interpolate the footholds using a Gaussian Process, obtaining a denser ground-truth.
{: .text-justify}

![](/assets/images/elevation_mapping/dense_targets.png)

The estimator model is an encoder-decoder convolutional neural network taking a voxelized version of the colored point cloud as input. It works 
autoregressively to build upon its previous estimate given new measurements. The network is built using sparse convolutions from the [Minkowski Engine](https://nvidia.github.io/MinkowskiEngine/) for efficient processing of the 3D point cloud data.
{: .text-justify}

![](/assets/images/elevation_mapping/network_architecture.png)

The following video shows the elevation estimate produced by the trained model along with the measured colored point cloud as the robot
walks through terrain with areas of dense vegetation.
{: .text-justify}

{% include video id="5wlb0C1I06g" provider="youtube" %}



### Limitations and Ideas for Future Work

The approach presented here has a big limitation: the model only learns about where it can walk from the past trajectories, but not *where it can't walk*.
For example, if the model is presented with an object such as a large rock or a tree, it will not be able to give a reasonble estimate at the location of the object. This is because for the collected trajectories, the operator will never purposefully try to make the robot walk over a large rock or up a tree where they know that the robot will fail. As such, the model trained by supervised learning will fail to output something sensible for these cases. 
{: .text-justify}

Some ideas for overcoming this are:
- Using the epistemic uncertainty of the model to find areas of the estimated elevation map where the model is unsure, and handle these areas separately
- Add trajectories from simulation into the training data, where the robot is able to try and traverse over larger objects without fear of damage.
