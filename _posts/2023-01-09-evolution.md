---
title: "Learning Robot Morphology Evolution"

---

Evolutionary search is a common approach to optimizing the morphology of a robot for some task. This involves generating random mutations to a robot's morphology and eliminating the poorly performing mutants. Doing this evolutionary process for a few iterations/generations to eventually find a performant morphology by survial-of-the-fittest.
{: .text-justify}

This project was more done out of curiosity than to solve a practical problem. We take an unusual, and to our knowledge, novel approach by formulating the evolutionary search process itself as a Markov Decision Process (MDP). Robot morphologies are the states, the applied mutations are the actions, and the change in performance after a mutation is the reward. Viewing evolution as an MDP allows us to train an evolutionary agent using Reinforcement Learning (RL) to learn which mutations would to useful to improve a given morphology.
{: .text-justify}

I like to think of this as a turtle wanting to, but unable to reach a fruit high up in a tree. And instead of waiting millions of year until one of its descendants has a evolved a morphology capable of reaching the fruit, the turtle wakes up the next day with wings.
{: .text-justify}


### Approach

We formulate robot morphologies as graphs. With nodes being the limbs making up parts of the body, and edges being the joints which connect the limbs. Consequently, our evolutionary decision making agent is a graph neural network (GNN). To simplify things, we use a fixed set of discrete mutations which can be applied to the limbs. We also only allow a single mutation to be applied to a single limb at each step. The GNN takes in the current morphology and outputs a set of values over the possible mutations for each limb. The exact meaning of these values depends on the RL algorithm used, but in all cases, they're used to compared and pick one of the available mutations.
{: .text-justify}

![](/assets/images/learning_evolution/nn_architecture.png)

Note that in order to compute the MDP's reward, we need to evaluate how good a morphology is at completing the specified task. Therefore, we must also have a controller for each morphology. Ideally, this controller is the optimal controller for the morphology and task. In practice, this controller is obtained for each morphology through another RL process. This controller RL training is definitely the bottleneck of the entire process. To speed up this controller training, the parameters of a morphology's controller are initialized from the controller parameters of its parent. An additional benefit of inheriting the parent's controller is that the controller improves along with the morphology itself throughout and evolutionary rollout.
{: .text-justify}

As we mostly wanted to see if this idea would even work, and due to limited resources, we applied our method to very simple toy problems of morphologies with only a few limbs.
{: .text-justify}

The following video shows a trained evolutionary agent mutating a morphology with the goal being to move to the right as quickly as possible. We see that not only does the morphology improve but the controller as well as it is passed down the generations.
{: .text-justify}

{% include video id="BksKxVRwkpE" provider="youtube" %}

