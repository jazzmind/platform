All ANSWER options are yes/no plus text box with space for an attachment as evidence (edited) 

Q1 Does your organisation maintain on-premise or cloud-hosted environments — or a hybrid of both — for internal use, or to deliver services to clients?
Answer yes if your organisation maintains (or is responsible for maintaining) a physical or cloud-hosted network that allows user devices to connect and communicate with any data storage or processing services, or if your organisation maintains any physical or cloud-hosted application or service delivery infrastructure. You should also answer yes to this question if you use a public cloud (e.g. Azure, GCP, AWS) to host applications or services since you are responsible for implementing security controls within that environment. You should answer no if your organisation only uses Software-as-a-Service that is hosted and maintained by external service providers (e.g. Google Workspace, Microsoft365, etc.), accessed through standard web or desktop applications.

Q2 Are all ingress and egress points for traffic through your network or cloud environment protected by firewalls?
Answer yes if your organisation has secured all of the ingress and egress points of its corporate network and IT environments (cloud-based or otherwise) with firewalls - whether as discrete appliances or as cloud-hosted network security service functions. (edited) 

Q3 Were the firewalls implemented using a deny all policy, with rules built around your organisation’s requirements?
Answer yes if the firewalls were implemented with a 'deny all' policy, and each rule was only added when a business requirement was identified, documented and approved by an authorised individual.

Q4 Does your organisation review its firewall rules at least annually?
Answer yes if your organisation undertakes an annual firewall rule review in which it removes any redundant rules and makes sure that all of the rules are relevant to its business operations. Please state in the notes the date of the last review.

Q5 Does your organisation have web application firewalls (WAFs) implemented to protect web applications?
Answer yes if all web applications hosted by your organisation are protected with WAFs (web application firewalls) - whether as discrete appliances or as cloud-hosted network security service functions. If your organisation does not host any web applications, answer 'No' and state this in the notes section.

Q6 Were the WAFs implemented with rulesets that have been built or tailored to your organisation’s requirements?
Answer yes if the WAFs have been implemented with a ruleset that has been tailored to your specific business requirements for the applications that you are protecting.

Q7 Does your organisation review its WAF rules at least annually?
Answer yes if your organisation undertakes an annual WAF rule review in which it removes any redundant rules and makes sure that all of the rules are relevant to its business operations. Please state in the notes the date of the last review.

Q8 Has your organisation implemented segmentation or segregation in your networks and/or cloud environments?
Answer yes if your organisation has appropriately segregated its network or cloud environments to restrict the level of access to sensitive information, hosts, and services. Examples include segregation of production systems from systems being commissioned or decommissioned and systems under test; segregation of systems with different security levels (e.g. those processing sensitive personal data or financial data are segregated from other business systems) and segregation or segmentation of services used by different subsidiary organisations.

Q9 Does your organisation place all publicly accessible services in isolated network DMZs (or separate subnets)?
Answer yes if your organisation hosts all publicly accessible services within a DMZ (a DMZ or demilitarised zone is a public facing subnet that acts as a barrier between your organisation's internal environment and the internet or other public network).

Q10 Does your organisation have any controls implemented to protect it against Denial of Service (and Distributed Denial of Service) attacks?
Answer yes if your organisation has implemented controls to protect its services against DOS (Denial of Service) and DDOS (Distributed Denial of Service) attacks. Please describe the nature of these controls in the notes section.

Q11 Does your organisation secure and encrypt all data transfers using an appropriate control/protocol (for example, SFTP, HTTPS), and are all data transfers subject to review and authorisation?
Answer yes if all data transfers to and from your organisation are approved by relevant parties and secured with an appropriate level of authentication and encryption (such as HTTPS for web traffic including APIs and SFTP for file transfers). Please describe the nature of these controls in the notes section, both technical and procedural.

Q12 Does your organisation manage and control the use of, and access to, any cryptographic keys?
Answer yes if your organisation controls the use of, and access to, cryptographic keys. These keys are typically used to access IT infrastructure and services. Please upload a supporting document (as a PDF file) outlining the process, or describe the process in the notes section as evidence.

Q13 Does your organisation secure remote access to its network or cloud environment using multi-factor authentication?
Answer yes if your organisation forces all remote connections to its network or cloud environment to be secured using two factor authentication.

Q14 Does your organisation keep a list of approved network connections (such as site to site VPNs) between your corporate network and third parties?
Answer yes if your organisation keeps a list of approved network connections between its own network and any third party networks.

Q15 Is each of the approved network connections subject to a risk assessment?
Answer yes if your organisation completes a risk assessment for each identified network connection between your network and any third party network.

Q16 Is each of the approved network connections subject to regular review?
Is each of the approved network connections subject to regular review?
Answer yes if your organisation undertakes a regular review of network connections (e.g. annually) in which it removes any redundant connections and makes sure that all of the connections are relevant to its business operations.

Q17 Does your organisation conduct regular automated vulnerability scans of its public facing IT infrastructure and remediate any findings?
Answer yes if your organisation conducts regular external automated vulnerability scans of its public IP infrastructure and remediates the findings.

Q18 How many external automated vulnerability scans does your organisation conduct each year?
How many external automated vulnerability scans does your organisation conduct each year?
ENTER NUMBER
Then text field + attachment.

Q19 Does your organisation conduct regular automated vulnerability scans of its internal IT infrastructure and remediate any findings?
Answer yes if your organisation conducts regular automated vulnerability scans of its internal IP infrastructure and remediates the findings. This may include scanning assets in a private local network or using a cloud service provider's tools to scan for vulnerabilities in your cloud infrastructure.

Q20 How many internal automated vulnerability scans does your organisation conduct each year?
Please state the number of automated scans completed every year.
ENTER NUMBER
Then text field + attachment.

Q21 Does your organisation conduct regular penetration tests of its public facing IT infrastructure?
Answer yes if your organisation conducts regular penetration tests of your public facing IT systems and infrastructure and that you remediate the findings. The test should include manual testing by a skilled person in the role of a threat actor with technical verification and validation of any findings. Please state in the notes how often these tests are completed. Please provide your last pentest report summary (not the detailed findings) as evidence.

Q22 Does your organisation conduct regular penetration tests of its internal systems where the test assumes perimeter controls have been compromised?
Answer yes if your organisation conducts regular penetration tests of your internal IT systems and infrastructure and that you remediate the findings. The test should include manual testing by a skilled person in the role of a threat actor with technical verification and validation of any findings. The test should assume that perimeter controls have been compromised, for example that a legitimate internal user's credentials have been stolen and re-used. The test should assess a threat actor's ability to reach assets and information, including opportunities to elevate privileges to gain access. The results of the tests can inform improvements to IT systems and infrastructure, for example improved subnet segregation and role access privileges and controls. Please state in the notes how often these tests are completed. Please provide your last pentest report summary (not the detailed findings) as evidence.

Q23 Does your organisation have processes in place to triage and remediate identified vulnerabilities by inputting them into the relevant workflows?
Answer yes if you have processes in place which facilitate effective triage of vulnerabilities and input necessary remediations into the appropriate workflows, for example, development, IT change management or ad-hoc improvement programmes. This should cover all vulnerabilities identified through scanning, penetration tests, or other inputs such as external alert feeds or internal employee reporting. It should also include communication of vulnerabilities to key stakeholders (including relevant clients) where temporary compensating controls may be required. Please give details of your process(es) in the notes section.

Q24 Has your organisation implemented any network or cloud monitoring controls such as Intrusion Detection Systems (IDS), Intrusion Prevention Systems (IPS), or Security Information and Event Management (SIEM) systems?
Answer yes if your organisation has implemented any network or cloud monitoring solutions (either in house or via a third party service provider). Please describe which solutions you have in place and the coverage they have over your network(s) or cloud environment(s).

Q25 Does your organisation have defined processes in place to ensure that all security alerts from logging and monitoring solutions are reviewed and actioned as necessary?
Answer yes if your organisation has processes in place to frequently review and act upon events and alerts from security logs and monitoring tools. Please describe your processes for different types of security logs and events in the notes section.

Q26 Does your organisation monitor the capacity of its systems processing client information to make sure they are able to cope with load?
Answer yes if your organisation has controls in place to monitor the capacity of its IT production systems to make sure that they can cope with the load. Please describe the controls in the notes section.

Q27 Does your organisation record and store user activity logs for all cloud environments, networks and associated services?
Answer yes if your organisation records and stores user activity logs for its IT production systems, network devices and endpoint devices.

Q28 For how many months does your organisation store its user activity logs?
Please state how many months the logs are kept for.
Enter a number
text field +Attachment

Q29 Does your organisation record and store the logs of root/super user/ administrator actions for all cloud environments, networks and associated services?
Answer yes if your organisation records and stores administrator activity logs for its IT production systems, network devices and endpoint devices.

Q30 For how many months does your organisation store its root/super-user/administrator logs?
Please state how many months the logs are kept for.

Q31 Are all logs stored on a secure/hardened server that is logically separate from the systems being logged?
Answer yes if your organisation stores all recorded logs on dedicated servers that are logically separate from your production systems, and hardened.

Q32 Does your organisation have a process to test the deployment of business critical applications to their target managed environment (cloud or on-prem) to ensure there are no adverse impacts on operations or security?
Answer yes if your organisation has a robust testing process implemented to appropriately test the deployment of business critical applications to their target managed environment (cloud or on-prem) to ensure there are no adverse impacts on operations or the security of your IT estate. Please describe the nature of the testing process in the notes or provide a supporting document (as a PDF file) as evidence.

NOTE, Attached evidence is not a required field, but implied from some of the questions.

Q33 Does your organisation take regular immutable backups of its digital production data in line with current best practise guidelines?
Answer yes if your organisation takes regular backups of its production data that cannot be altered, deleted or tampered with for a specified time period. Backups must be taken in line with best practice guidelines, for example by following the '3-2-1' rule and segregating the backups from your main environment. Please describe your backup processes including segregation, frequency, and any other controls in place.

Q34 Does your organisation encrypt the backups using appropriate cryptographic standards to prevent unauthorised access to the backup data?
Answer yes if your organisation encrypts the backups using appropriate cryptographic standards to prevent unauthorised access to the data. Please state the encryption algorithm used in the notes section.

Q35 Does your organisation operate a secure configuration process to reduce any unnecessary vulnerabilities in your IT systems including servers, endpoints, network devices and systems hosted in a cloud environment?
Answer yes if your organisation has a configuration process that is followed for all IT assets. The process should define security settings and disable unneeded services, thereby reducing your attack surface. Please describe how your secure configuration process is performed, including both automated and manual checks. Please upload any relevant documentation (as a PDF file) as evidence.

Q36 Does your organisation have a formal change management process that gives consideration to information security?
Answer yes if your organisation has a formal change management process that includes a step to assess any security risks that the change may impact, and that requires a rollback plan. Please upload a supporting document (as a PDF file) outlining the process, or describe the process in the notes section as evidence.