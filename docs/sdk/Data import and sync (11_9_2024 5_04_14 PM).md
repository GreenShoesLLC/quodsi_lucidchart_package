 Data import and sync














What is data import and sync?
This function enables developers to take data from an external data source and pull it into Lucid.
This can be done by:

Hitting a third-party API and manually retrieving data.
Setting up data connectors, which automatically pull data from third-party APIs.


What can data import and sync do?

It can automatically pull data from external data sources to update properties of any Lucid element that can be data linked (shapes, lines, groups, or pages). Such properties include text, color, and more.



Any changes made to the data in Lucid will reflect back in the external data source. Pushing updates back to the external source can be made automatic or designed to appear to the user in stages or batches.


How does data import and sync work?
Data import and sync relies on Lucid's Extension API, and uses:

Editor Extensions to manage how data appears and acts on Lucid documents.
(Optionally) Data Connectors to automatically fetch changes made in third party systems, and to automatically push changes made in Lucid back to third party systems.
(Optionally) Shape Libraries to create custom shapes for displaying data.

You can step through the entire process of building a data import and sync cards integration here.
What are the limitations of data import and sync?

Data imported via extensions does not currently work with Lucid's out-of-the-box solution for org charts or timelines. Nevertheless, it's possible for the extension to manually construct such objects.
It's easy to work with data that can be represented tabularly. However, data formats that are not efficiently represented tabularly will be more difficult to work with due the the way Lucid stores data on the document.
