
# Description of the Product or Service & Problem it is Solving
Describe the product or service to be sold by the company and the customer problem that it solves (i.e., the need). Do you know potential market size? (1950 character limit)

Business Process Models (BPM) or Process Flow Diagrams (PFD) are often used to map a process or business function in order to analyze the process and then determine how the process can be improved.  Improvements might come from reduction of waste, increased efficiency, or increased throughput.  However, BPMs & PFDs are static and only define the structure of the process.  It does not portray the performance of the system, which is critical for process improvement analysis or problem solving activities.  This analysis requires the ability to test different system configurations or changes in order to determine which, if any, of the changes might meet the process improvement goals or maximize return on investment. In order to quantify any potential change to a system or a process, one typically uses two different tools - the process mapping tool, to define and map the system, and a data analytics tool, such as Excel, to enumerate key performance indicators (KPIs), such as throughput, resource utilization, cost and/or revenue, etc.
While spreadsheets are capable of modeling some degree of complexity, it becomes difficult to model dynamic, interactive, or complex systems with many interdependencies and randomness.  Discrete event simulation is a powerful analytical approach used to understand the performance of a system or process over time and under uncertain conditions.    Quodsi LLC is creating a solution that will convert a static process flow diagram into a discrete event simulation model.  This will allow users to easily simulate the performance of a system, creating what-if scenarios to maximize efficiencies & ROI or to assess and mitigate risks.  
Quodsi’s solution will integrate with existing process mapping tools, such as Lucid Chart, to significantly reduce the learning curve for using simulation technology and removing the need to build the same diagram in two different tools.


# Competitive Advantage
What are the current and anticipated solutions to the problem, i.e., the competitive products or services? Why is your product or service better than the competition, and why will it have a sustainable competitive advantage? Are there any significant barriers to entry? (1950 character limit)


Process mapping & diagraming continues to be the standard approach for documenting and analyzing a system or a process.  There are numerous software tools available for diagramming a process or a system, such as Lucid Chart, Miro, Draw.io, etc.  However, these are not our competitors, but instead are considered strategic partnerships and sales channels since we will be integrating our technology into their platforms. 
There is a market of established discrete event simulation tools, along with a number of open source simulation packages, that can be used to model business processes.  However, these tools have a very steep learning curve and an engineering background is often needed to understand the nuances of how to build and analyze a model. These tools are sold exclusively as B2B and with expensive annual license fees.  They market their ability to create large, complex models.  Quodsi will be targeting a different type of user - one that does not need to build a complex simulation model and therefore should not need to struggle through learning a complicated tool. We will focus on ease of use and simplicity by meeting our target user inside processing mapping tools that they are already using and offering the ability to convert existing process diagrams into simulations with a few clicks of their mouse.  

……………………………………………..

# Technology Platform
Describe the underlying technology and what needs to be done to develop the intellectual property position further. Do you have IP protected i.e. a patent or options? Was a university or corporate employee involved or were resources used in the creation of the technology? (1950 character limit)

Quodsi is built on a modern, multi-tiered technology stack that combines discrete event simulation with intuitive visual modeling.   The core platform consists of three integrated components: a LucidChart extension for visual modeling (built with TypeScript/JavaScript), a React-based user interface, and a Python-based discrete event simulation engine. This is supported by a .NET Web API backend for enterprise integration and a custom LucidChart API client for seamless diagram manipulation.  We have chosen to begin with an integration to LucidChart, but plan to expand to other diagramming tools so we are architecting the solution with those expansion plans in mind. 
The platform's intellectual property centers on the integration of visual business process modeling with sophisticated simulation capabilities. The key innovation lies in the translation layer between visual diagrams and executable simulation models, allowing business users to leverage familiar diagramming tools for complex process analysis. The system architecture employs modern web technologies and follows a microservices approach, ensuring scalability and maintainability.
No existing patents are currently held, though the unique approach to visual simulation modeling may present opportunities for IP protection. The technology was developed independently without university or corporate resources.

# Development Activities
What is the status of the development of the product or service? What are the near term activities and key milestones that are required for the development of the product or service? Are there any key alliances necessary? (1950 character limit)

The platform is currently in advanced development with core functionality implemented across all major components. The LucidChart extension and React frontend provide the user interface layer, while the Python-based Quodsim engine handles simulation processing. The .NET API enables enterprise integration and data management.
Near-term development milestones include:
Enhancement of the simulation engine to handle more complex business scenarios
Implementation of advanced analytics and reporting features in the React frontend
Development of additional LucidChart integration features for improved process modeling
Longer-term development milestones include: 
Expansion of the API capabilities for better enterprise system integration
Add additional translators to support Quodsi integration into another diagramming tool
Key strategic alliances would be beneficial with:
LucidChart for deeper platform integration
Enterprise software vendors for system integration
Industry partners for domain-specific process modeling templates


# Business Model
How will the company generate revenue? Describe your marketing and sales strategy for capturing and defending significant market share. What are your profit expectations? (1950 character limit) 

Quodsi will follow a product led sales approach.  We will offer the Lucidchart extension (add-on) free, allowing users to convert existing process diagrams into a simulation model or to build a simulation model from scratch by using the Quodsi library of objects that are part of our Lucidchart extension.  While the size of the diagram, and therefore model, that can be built will not be limited, we will only allow the users to run (or execute) “small” simulation models free of charge. This will allow the user to experience the power of the solution but will also support conversion into a paying account.  We will begin with targeting individual users but plan to quickly move into supporting an enterprise, or team, based pricing strategy.   

Our pricing will be aligned with a similar model that Microsoft Azure uses to charge us for hosting our solution on their cloud platform.   Since we pay Microsoft for both storage of data and for the usage of processing power each time a simulation is run, we will also be charging our customers based on their usage.  We will offer tiered pricing packages, on a subscription basis, that provide different amounts of “processing hours”, which are needed to run a simulation and different amounts of storage, which would dictate the number of models and history of results that can be stored by that user. 

Our entry into the market is with an integration with LucidChart, therefore, we have access to a large group of current LucidChart customers.  We also plan to try and utilize existing LucidChart marketing channels and resources, while also expanding our strategic partnership with Lucid to build a joint new user acquisition strategy.  We will follow a similar marketing strategy with the other diagramming tools that we chose to integrate with. 

# Managerial and Development Team
Describe briefly the role of current participants and give their relevant background to their ongoing involvement in the product development or proposed company. (1950 character limit)

Our company consists of the two co-founders, Renee Thiesing & Daniel Hickman.  Dan and Renee share two goals; to bring a discrete event simulation to a wider audience by reducing the complexity of model building and to create a new software solution from concept design to penetration in its established market.  

Renee Thiesing had a focus on discrete event simulation while pursuing her masters degree in Industrial Engineering.  She was employee number seven at what is now a market leading, general purpose discrete event simulation software company.  Renee experienced growing a software product and a software company from its Beta stage to mature, market establishment.  Renee held positions in application engineering, services consulting,  technical support and business development.  Next, she led the establishment of strategic alliances and partnerships and ended her time at Simio as VP of Product, overseeing all product development and design.   Renee is the business focused co-founder, taking a lead on the overall business strategy, growth, and operations.
Daniel Hickman, with a background in Industrial Engineering, has significantly contributed to the field of predictive analytics and modeling. As the former Chief Technology Officer at ProModel, he played a key role in the company's growth and subsequent acquisition by Big Bear AI, with his ability to drive business value and innovation. Daniel architected software solutions for industries including pharmaceuticals, healthcare, and defense at ProModel, significantly influencing the company’s product strategy. Daniel has extensive experience in software development and strategic leadership.  Daniel is the technical co-founder, overseeing the technical aspects of the product, development process, and innovation.




# Financial Plan
Describe any funding to date, the dollar amount, use of the funds, and the source. (1950 character limit)

We have not received any funding and have only invested a small amount of personal money towards administrative tools.  We were accepted into the Microsoft Founders program for startups, which provides us with access to free Azure usage credits that are sustaining us during the development of our Beta software version.   

Until we launch our version 1.0 and decide to scale, we are bootstrapping. 


